import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.route.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth",authRouter);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
})

app.use(errorMiddleware)


export default app;
