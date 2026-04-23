# Album Inline Track Upload Design

Date: 2026-04-23

## Goal

Extend the existing `POST /albums` endpoint so album creation supports all three flows:

1. Create an album without tracks.
2. Create an album using already-uploaded tracks via `track_ids`.
3. Create an album and upload brand-new track audio files in the same request.

The endpoint must remain backward compatible for existing clients.

## Non-Goals

- No new endpoint such as `/albums/batch-upload`.
- No change to the existing standalone `POST /tracks` API.
- No change to album update routes beyond continuing to support later artwork/track edits through existing endpoints.
- No frontend work in this phase.

## Approved Product Rules

### Supported creation flows

`POST /albums` must support:

- album metadata only
- album metadata plus existing `track_ids`
- album metadata plus newly uploaded tracks
- album metadata plus both existing `track_ids` and newly uploaded tracks

### Track metadata model for inline uploads

For newly uploaded tracks, the request uses a hybrid model:

- `title` is required per new track
- all other track fields are optional overrides:
  - `genre`
  - `description`
  - `tags`
  - `lyrics`
  - `visibility`
  - `preview_start_seconds`

If an override is omitted, normal backend defaults apply, except for album artwork inheritance described below.

### Album artwork inheritance

If the album request includes album `artwork` and a new uploaded track does not include its own artwork, that new track inherits the album artwork URL.

If a new uploaded track includes its own artwork, the per-track artwork takes precedence.

If neither album artwork nor per-track artwork exists, the track keeps the current default artwork behavior.

### Ownership rules

- Existing `track_ids` must still belong to the album creator.
- Newly uploaded tracks belong to the album creator automatically.

### Ordering rules

The album stores tracks in request order:

- existing `track_ids` appear in the order supplied
- newly uploaded tracks appear in the order defined by `tracks_metadata`
- if both are supplied, the final album order is:
  - existing `track_ids` first
  - then newly created tracks from `tracks_metadata`

## API Contract

### Endpoint

`POST /albums`

### Content type

`multipart/form-data`

### Accepted request parts

Album-level fields:

- `title`
- `genre`
- `description`
- `type`
- `visibility`
- `release_date`
- `artwork`

Optional existing track attachment:

- `track_ids`

Optional inline new track creation:

- `tracks_metadata`
- `audio_files`
- `track_artwork_files`

### Request shape

The request continues to accept existing album fields and adds the following optional multipart fields:

- `track_ids`
  - may arrive as a JSON array string, a single scalar value, or repeated field values
  - the service will normalize all of these into one ordered array of ids
- `tracks_metadata`
  - JSON array string
- `audio_files`
  - multiple uploaded audio files
- `track_artwork_files`
  - multiple uploaded image files

Each object in `tracks_metadata` must have:

- `title`
- `audio_index`

Each object may also have:

- `artwork_index`
- `genre`
- `description`
- `tags`
- `lyrics`
- `visibility`
- `preview_start_seconds`

### Example multipart payload

```text
title=My Album
genre=Hip-Hop
visibility=public
track_ids=["existingTrackId1","existingTrackId2"]
tracks_metadata=[
  {
    "title":"Intro",
    "audio_index":0
  },
  {
    "title":"Main Song",
    "genre":"Trap",
    "lyrics":"...",
    "audio_index":1,
    "artwork_index":0
  }
]
artwork=<album cover file>
audio_files=<intro.mp3>
audio_files=<main.mp3>
track_artwork_files=<main-song-cover.jpg>
```

## Validation Rules

### Album validation

Preserve current album creation validation:

- `title` is required
- `genre` is required
- album artwork image validation remains unchanged

### Existing tracks

When `track_ids` are provided:

- every referenced track must exist
- every referenced track must belong to the requesting artist
- duplicate tracks in the same album are rejected

### Inline uploaded tracks

When `tracks_metadata` is provided:

- it must parse as valid JSON
- it must parse to an array
- each entry must be an object
- each entry must include `title`
- each entry must include a valid integer `audio_index`
- each `audio_index` must point to an uploaded `audio_files` entry
- `artwork_index` is optional, but if present it must be a valid integer pointing to an uploaded `track_artwork_files` entry
- duplicate `audio_index` references are rejected for this phase to avoid one uploaded audio file producing multiple track records accidentally

### Mixed mode validation

When both `track_ids` and `tracks_metadata` are supplied:

- the resulting album cannot contain duplicate track records
- existing uploaded tracks and newly created tracks are combined into one final ordered list

### Error responses

Return `400 Bad Request` for:

- malformed `tracks_metadata`
- invalid indexes
- missing required `title`
- missing referenced upload file
- duplicate track references within the album request

Return `403 Forbidden` for:

- existing track ownership violations

Return `404 Not Found` for:

- referenced existing tracks that do not exist

## Architecture

### Route and multipart handling

The existing album creation route remains `POST /albums`, but its upload middleware changes from a single-file album artwork parser to a multipart field parser that accepts:

- `artwork`
- `audio_files`
- `track_artwork_files`

This route must remain compatible with requests that only send album metadata and optional album artwork.

### Controller responsibility

`album.controller.createAlbum` will pass:

- `req.body`
- album artwork from `req.files` or equivalent normalized access
- uploaded audio files
- uploaded track artwork files

to the album service.

The controller stays thin and does not parse track metadata itself beyond passing request data along.

### Service responsibility

`album.service.createAlbum` becomes the orchestration layer for all three flows:

1. validate album-level fields
2. parse and normalize `track_ids`
3. parse and normalize `tracks_metadata`
4. validate uploaded file indexes
5. upload album artwork if present
6. validate existing tracks and prepare album entries
7. create brand-new tracks for inline uploads
8. apply album-artwork inheritance where needed
9. create the album with the final combined track list

### Track creation reuse

The current standalone track upload logic already owns:

- audio MIME validation
- file-size validation
- audio metadata extraction
- waveform extraction
- upload quota enforcement
- S3 upload logic
- DB track creation rollback for failed saves

To avoid duplicating this behavior inside album creation, the track service should expose an internal reusable helper for "create track from validated multipart file inputs". Album creation can call that helper for each new uploaded track.

The helper should accept track overrides plus explicit `audioFile`, `coverFile`, and `userId`.

## Detailed Processing Flow

### Case 1: album only

- validate album fields
- optionally upload album artwork
- create album with empty `tracks`

### Case 2: album plus existing `track_ids`

- validate album fields
- optionally upload album artwork
- resolve each existing track
- verify ownership
- compute album `track_count` and `total_duration`
- create album with those existing track references

### Case 3: album plus new uploaded tracks

- validate album fields
- optionally upload album artwork first
- parse `tracks_metadata`
- for each metadata item:
  - resolve `audio_file` by `audio_index`
  - resolve optional track artwork by `artwork_index`
  - if no track artwork exists and album artwork exists, use album artwork for the new track
  - call reusable track creation logic
- build album track entries from created track ids
- compute `track_count` and `total_duration`
- create album

### Mixed case: existing tracks plus new uploaded tracks

- perform both branches
- preserve final order as:
  - existing `track_ids`
  - then newly created tracks

## Atomicity and Rollback

`POST /albums` should behave atomically from the caller's perspective.

If any step fails after album artwork or inline track uploads begin:

- newly created track records from this request must be deleted
- newly uploaded S3 assets from this request must be deleted where possible
- the album record must not remain partially created

Rollback scope includes:

- album artwork uploaded during this request if album creation fails
- audio files uploaded for newly created inline tracks
- per-track artwork files uploaded for newly created inline tracks
- DB records for newly created inline tracks

Existing tracks referenced via `track_ids` are never modified or deleted during rollback.

## Testing Strategy

### Album service tests

Add coverage for:

- create album with only album fields
- create album with existing `track_ids`
- create album with new uploaded tracks
- create album with both existing and new tracks
- track inherits album artwork when no per-track artwork is supplied
- per-track artwork overrides album artwork
- malformed `tracks_metadata`
- invalid `audio_index`
- invalid `artwork_index`
- duplicate track rejection
- ownership violation on existing `track_ids`
- rollback when a late step fails after uploads or track creation

### Middleware tests

If needed, add focused middleware coverage to ensure the updated multipart handler accepts:

- album-only requests
- album plus multiple `audio_files`
- album plus multiple `track_artwork_files`

### Regression coverage

Preserve backward compatibility with current album creation behavior:

- existing clients that send only album fields still work
- existing clients that send album fields plus `track_ids` still work

## Postman / PostDoc Impact

After implementation, the album module documentation should be updated to show:

- album-only creation
- album creation with existing `track_ids`
- album creation with inline uploaded tracks
- artwork inheritance behavior for new tracks

## Risks

### Multipart complexity

Mixing JSON metadata arrays and file indexes in one multipart request increases parsing complexity. This is acceptable because it preserves a single endpoint and avoids fragile nested multipart conventions.

### Large uploads

Uploading multiple audio files in one request increases request size and processing time. This is acceptable for this phase, but the implementation should keep validation strict and rollback predictable.

### Duplicate business logic

If album creation reimplements track creation directly, the two flows will drift. Reusing internal track-service logic is important to keep validation and S3 behavior aligned.

## Recommended Implementation Direction

Implement the feature on the existing `POST /albums` endpoint using:

- optional `track_ids`
- optional `tracks_metadata` JSON array
- optional `audio_files`
- optional `track_artwork_files`

and a reusable internal track-creation helper that album creation can call for each inline uploaded track.
