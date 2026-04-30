import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./config/db.config.js";

dotenv.config();


const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
      // connect database
      await connectDB();
  
      // start server ONLY after DB connects
      app.listen(PORT, () => {
        console.log(` Server running on port ${PORT}`);
      });
  
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };
  
  startServer();