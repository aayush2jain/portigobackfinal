const axios = require("axios");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

// Registers Google OAuth only when the required credentials are present.
const configurePassport = () => {
  const hasGoogleConfig =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL;

  if (!hasGoogleConfig) {
    return passport;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          let googleUserInfo = {};

          try {
            const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            googleUserInfo = response.data || {};
          } catch (_error) {
            googleUserInfo = {};
          }

          const email = profile.emails?.[0]?.value || googleUserInfo.email;

          if (!email) {
            return done(null, false, { message: "Google account does not expose an email address" });
          }

          const name =
            profile.displayName ||
            googleUserInfo.name ||
            [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(" ") ||
            email.split("@")[0];

          const avatar = profile.photos?.[0]?.value || googleUserInfo.picture || "";

          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email: email.toLowerCase() }]
          });

          if (user) {
            user.googleId = profile.id;
            user.authProvider = "google";
            user.name = user.name || name;
            user.avatar = user.avatar || avatar;
            user.isEmailVerified = true;
            await user.save({ validateBeforeSave: false });
          } else {
            user = await User.create({
              name,
              email,
              avatar,
              googleId: profile.id,
              authProvider: "google",
              isEmailVerified: true
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  return passport;
};

module.exports = configurePassport;
