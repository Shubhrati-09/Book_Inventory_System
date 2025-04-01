import { Strategy as LocalStrategy } from 'passport-local'; // Correct import for passport-local
import bcrypt from 'bcrypt';

export function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
      const user = getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'No user with that email' });
      }
  
      try {
        if (password === user.password) {
          return done(null, user);
        } else {
          console.log(`Username = ${user.email}`);
          console.log(`Entered Password = ${password}`);
          console.log(`Stored Password = ${user.password}`);
          
          return done(null, false, { message: 'Password incorrect' });
        }
      } catch (error) {
        return done(error);
      }
    };
  
    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((id, done) => {
      return done(null, getUserById(id));
    });

  }
  
