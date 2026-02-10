import express from 'express';
import { openPool } from './utils/db.util';
import { logger } from "./utils/logger.util";
import cors from 'cors';

import * as AuthMiddleware from './middleware/auth.middleware';
import { RoleName } from './models/enums/auth.enum';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
//import { membershipTypeRouter } from './routes/membership-type.routes';
import { testRoute } from "./routes/test.routes";
//import { membershipRouter } from './routes/membership.routes'


const setUpMiddleware = (app: express.Express) =>{
  app.use(express.json());
  app.use(cors());

  app.use((req, _, next)=>{
    logger.info(`Incoming request: ${req.method} ${req.url}`)
  });
}

const setUpRoutes = (app: express.Express) =>{
  const apiRouter = express.Router()
  
  apiRouter.use(
    '/test',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.requireRole(RoleName.ADMIN),
    testRoute
    );

  apiRouter.use("/auth", authRouter);
  
  apiRouter.use(
    "/user",
    AuthMiddleware.authenticateToken,
    AuthMiddleware.requireAnyRole([RoleName.SYSTEMADMIN, RoleName.ADMIN]),
    userRouter
  );
    
  /*apiRouter.use(
    "/membership-type",
    AuthMiddleware.authenticateToken,
    AuthMiddleware.requireAnyRole([RoleName.SYSTEMADMIN, RoleName.ADMIN]),
    membershipTypeRouter
  );

  apiRouter.use(
    "/membership",
    AuthMiddleware.authenticateToken,
    membershipRouter
  );*/

  app.use(
    "/api",
    apiRouter
  );

}

const startServer = async () => {
  const app = express();

  // Constants
  const PORT = process.env.PORT || 3003;

  setUpMiddleware(app);
  setUpRoutes(app);

  // Listening
  app.listen(PORT, async () => {
    logger.info(`Listening in PORT: ${PORT}`);

    await openPool();
  });
};

// Initialize
startServer();