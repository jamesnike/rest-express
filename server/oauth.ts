import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateToken } from './jwtAuth';

// Configure Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let [user] = await db.select().from(users).where(eq(users.googleId, profile.id));
      
      if (!user) {
        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          [user] = await db.select().from(users).where(eq(users.email, email));
        }
        
        if (user) {
          // Update existing user with Google ID
          await db.update(users)
            .set({
              googleId: profile.id,
              authProvider: 'google',
              profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id));
        } else {
          // Create new user
          const newUserId = `google_${profile.id}_${Date.now()}`;
          [user] = await db.insert(users)
            .values({
              id: newUserId,
              email: email || null,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
              googleId: profile.id,
              authProvider: 'google',
              animeAvatarSeed: `google_${profile.id}`,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error as Error, undefined);
    }
  }));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'photos']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Facebook ID
      let [user] = await db.select().from(users).where(eq(users.facebookId, profile.id));
      
      if (!user) {
        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          [user] = await db.select().from(users).where(eq(users.email, email));
        }
        
        if (user) {
          // Update existing user with Facebook ID
          await db.update(users)
            .set({
              facebookId: profile.id,
              authProvider: 'facebook',
              profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id));
        } else {
          // Create new user
          const newUserId = `facebook_${profile.id}_${Date.now()}`;
          [user] = await db.insert(users)
            .values({
              id: newUserId,
              email: email || null,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
              facebookId: profile.id,
              authProvider: 'facebook',
              animeAvatarSeed: `facebook_${profile.id}`,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error as Error, undefined);
    }
  }));
}

// Helper function to generate JWT for OAuth users
export function generateOAuthToken(user: any): string {
  return generateToken(user);
}

export default passport;