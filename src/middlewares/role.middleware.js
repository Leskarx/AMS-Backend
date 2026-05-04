function roleMiddleware(role){
    return (req, res, next) => {
  
      if (!req.user || req.user.role !== role) {
        return res.status(403).json({ message: "Forbidden: Access denied" })
      }
  
      next()
    }
  }
  
  export default roleMiddleware  