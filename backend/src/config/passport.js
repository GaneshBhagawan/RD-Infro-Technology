import passport from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import User from '../models/User.js'

const options = {
  // Extract JWT from Authorization: Bearer <token> header
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey:    process.env.ACCESS_TOKEN_SECRET,
}

passport.use(
  new JwtStrategy(options, async (jwtPayload, done) => {
    try {
      // jwtPayload.userId is set when we sign the token in auth.controller.js
      const user = await User.findById(jwtPayload.userId).select(
        '-password -refreshToken'
      )

      if (!user) return done(null, false)
      return done(null, user)

    } catch (error) {
      return done(error, false)
    }
  })
)

export default passport