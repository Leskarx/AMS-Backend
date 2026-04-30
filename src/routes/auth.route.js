import { Router } from 'express';

const router = Router();

router.get('/login',(req, res) => {
    res.status(200).json({ message: "Login route" });
})

export default router;



