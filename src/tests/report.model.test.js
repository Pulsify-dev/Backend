import { expect } from "chai";
import Report from "../models/report.model.js";

describe("Report model", () => {
  it("should accept Album as a reportable entity type", () => {
    const report = new Report({
      reporter_id: "507f1f77bcf86cd799439011",
      entity_type: "Album",
      entity_id: "507f1f77bcf86cd799439022",
      reason: "Spam",
    });

    const error = report.validateSync();

    expect(error).to.equal(undefined);
  });
});
