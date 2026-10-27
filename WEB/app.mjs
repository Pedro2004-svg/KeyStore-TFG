import express from "express";
import path from "path";
import taskRoutes from "./routes/task_routes.mjs";

const app = express();
const PORT = 60001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(path.resolve("."), "views"));

app.use(express.static(path.join(path.resolve("."), "public")));
app.use("/", taskRoutes);

app.listen(PORT, () => {
    console.log("Servidor WEB escuchando en:", PORT);
});

export default app;