import ApiError from "../utils/ApiError.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginSchema } from "../validators/auth.validator.js";

async function loginUser(req,res,next) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    const parsed = loginSchema.safeParse(req.body)

if (!parsed.success) {
throw new ApiError(parsed.error.issues[0].message, 400)
}

const { email, password } = parsed.data
       const savedUser=await prisma.user.findUnique(
          {where:{email}}
       )
       if(!savedUser){
          throw new ApiError("Invalid credentials",401)
       }
       const validPassword = await bcrypt.compare(password, savedUser.password)

       if (!validPassword) {
          throw new ApiError("Invalid credentials",401)
       }
       const token =jwt.sign( 
          { userId: savedUser.id, role: savedUser.role },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
)
return res.status(200).json({
  message:"login success",
  user: {
      id: savedUser.id,
      email: savedUser.email
    },
  token:token
})


      
  } catch (error) {
      next(error)
      
  }
  
}

export default loginUser