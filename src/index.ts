import 'reflect-metadata';
import * as express from 'express';
import * as dotenv from 'dotenv';
import { createConnection } from 'typeorm';

import { globalMiddleware } from './middleware';
import { authRoutes, childrenRoutes } from './routes';
import { connection } from './util/typeorm-connection';

dotenv.config();

createConnection(connection()).then(async () => {
    const app = express();

    globalMiddleware(app);

    app.use('/auth', authRoutes);
    app.use(childrenRoutes);

    const port = process.env.PORT || 4000;
    app.listen(port);
    console.log(`Listening on port ${port}`);
});
