import userRepository from '../repositories/user.repository.js';

const getPublicProfile = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new Error('User not found');
        }
    if (user.is_private) {
        throw new Error('User is private');
    }
    if (user.is_suspended) {
        throw new Error('User is suspended');      
    }
    return {
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        is_verified: user.is_verified,
        location: user.location,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        followers_count: user.followers_count,
    };}
