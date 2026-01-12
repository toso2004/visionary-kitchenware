import express from 'express';
import * as UserRouter from './routes/user.routes';

const app = express();
app.use(express.json());

app.use('/', UserRouter.router);

setInterval(() => {}, 1 << 30);

app.listen(3003, () => console.log("Server started on port 3003"));
