import express from 'express';
import errorMiddleware from './middleware/error.middleware.js';
import routes from './routes/index.js';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.use(errorMiddleware.notFound);

app.use(errorMiddleware.errorHandler);

export default app;