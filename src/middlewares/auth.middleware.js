import ApiError from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
 function authMiddleware(req,res,next){
    try {
        const authHeader = req.headers.authorization
    
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new ApiError("Unauthorized: Token missing",401)
        }
    
        const token = authHeader.split(" ")[1]
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        // const user = await User.findById(decoded.id).select("-password")
    
        req.user = decoded
    
        next()
    
      } catch (error) {
        next(error)
        // return res.status(401).json({ message: "Unauthorized: Invalid token" })
      }

}

export default authMiddleware