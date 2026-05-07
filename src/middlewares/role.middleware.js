function roleMiddleware(roles) {

  if (!Array.isArray(roles)) {
    roles = [roles];
  }

  return (req, res, next) => {

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden: Access denied"
      });
    }

    next();
  };
}

export default roleMiddleware;