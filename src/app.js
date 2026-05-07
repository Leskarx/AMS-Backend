import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.route.js';
import projectRouter from './routes/project.route.js';
import errorMiddleware from './middlewares/error.middleware.js';
import reviewRouter from './routes/review.route.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth",authRouter);
app.use("/api/projects", projectRouter);
app.use("/api/reviews", reviewRouter);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
})

app.use(errorMiddleware)


export default app;
