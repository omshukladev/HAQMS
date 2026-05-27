# 1st i read index.js after setup the code base i saw 2 error there

## ERROR 1: Improper Error Handling in Global Error Handler

```js
// GLOBAL ERROR HANDLER
// BUG: Improper error handling. It returns the raw error stack trace to the client,
// which leaks details about database types, schema layout, and file paths.
app.use((err, req, res, next) => {
  console.error("[CRITICAL-ERROR]:", err);
  res.status(500).json({
    message: "An unexpected internal server error occurred!",
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
```

> issue was that it returns the raw error stack trace to the client, which leaks details about database types, schema layout, and file paths. I fixed it by removing the `error` and `stack` properties from the response object.

> FIX: just return a generic error message without exposing sensitive details:

```js
app.use((err, req, res, next) => {
  console.error("[CRITICAL-ERROR]:", err);
  res.status(500).json({
    message: "An unexpected internal server error occurred",
  });
});
```

## ERROR 2: Unhandled Rejection Handler

```js
// Catch unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Intentionally do not exit process so candidates see unhandled promise logs
});
```

> Current: Catches the promise rejection, logs it, and keeps the server running in an unstable state.
> Fix: Log it, then exit so the process manager (or Docker) can restart cleanly.

```js
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
```

## ERROR 3: Weak CORS Configuration

```js
// Enable CORS for all origins (weak/broad CORS config)
app.use(cors());
```
> issue was that it allows all origins, which can lead to security vulnerabilities such as Cross-Site Request Forgery (CSRF) and data leaks. I fixed it by restricting CORS to a specific origin defined in an environment variable.
> FIX: In production, this should be restricted to specific origins to prevent unauthorized access. Allowing all origins can lead to security vulnerabilities such as Cross-Site Request Forgery (CSRF) and data leaks.

```js
// Enable CORS for all origins 
const cors = require("cors");
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true, // if you switch to cookie-based auth later    
  }),
);
```


