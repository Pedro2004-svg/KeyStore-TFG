import express from "express";
import taskControllers from "../controlles/task_controllers.mjs";

const router = express.Router();

router.get("/", taskControllers.paginaPrincipal);
router.get("/login", taskControllers.paginaLogin);
router.get("/registro", taskControllers.paginaRegistro);
router.get("/favoritos", taskControllers.paginaFavoritos);
router.get("/carrito", taskControllers.paginaCarrito);
router.get("/perfil", taskControllers.paginaPerfil);
router.get('/compra-exitosa', taskControllers.paginaCompra);

export default router;
