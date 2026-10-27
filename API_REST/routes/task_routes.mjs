import express from "express"
import taskControllers from "../controllers/task_controller.mjs"
import { checkSession } from './middleware/loggin.mjs'
import { invalidateCache } from "../app.mjs"

const router = new express.Router()

// ── Rutas públicas (sin sesión) ───────────────────────────────────────────────
router.get("/pagina-principal", taskControllers.paginaPrincipal)
router.get("/catalogo", taskControllers.showCatalog)
router.get("/stats/most-sold", taskControllers.getMostSoldGames)
router.get("/search", taskControllers.searchGames)
router.get("/stats/most-favorited", taskControllers.getMostFavoritedGames)
router.get("/categorias", taskControllers.getGamesByCategory)

// ── Sesión ────────────────────────────────────────────────────────────────────
router.post("/inicio-sesion", checkSession(false), taskControllers.startSession)
router.post("/crear-usuario", taskControllers.createUser)
router.post("/cerrar-sesion", checkSession(), taskControllers.closeSession)

// get-session requiere token válido para devolver datos del usuario
router.get("/get-session", checkSession(), taskControllers.getSession)

// ── Carrito temporal: token opcional (funciona para guests y usuarios) ────────
router.get("/carrito-temp", checkSession(false), taskControllers.showCartTemp)

router.post("/add-carrito-temp", checkSession(false), (req, res, next) => {
  invalidateCache("/carrito-temp")
  next()
}, taskControllers.addToCartTemp)

router.delete("/remove-carrito-temp", checkSession(false), (req, res, next) => {
  invalidateCache("/carrito-temp")
  next()
}, taskControllers.removeFromCartTemp)

router.delete("/remove-one-carrito-temp", checkSession(false), (req, res, next) => {
  invalidateCache("/carrito-temp")
  next()
}, taskControllers.removeOneFromCartTemp)

router.delete("/remove-all-carrito-temp", checkSession(false), (req, res, next) => {
  invalidateCache("/carrito-temp")
  next()
}, taskControllers.removeCartTemp)

// ── Finalizar compra: SÍ requiere sesión ─────────────────────────────────────
router.post("/finalizar-compra", checkSession(), (req, res, next) => {
  invalidateCache("/carrito-temp")
  invalidateCache("/stats/most-sold")
  next()
}, taskControllers.finalizePurchase)

// ── Favoritos: requieren sesión ───────────────────────────────────────────────
router.get("/favoritos", checkSession(), taskControllers.showFavourites)
router.post("/add-favoritos", checkSession(), (req, res, next) => {
  invalidateCache("/favoritos")
  next()
}, taskControllers.addFavourites)

// ── Cuenta: requieren sesión ──────────────────────────────────────────────────
router.put("/change-password", checkSession(), (req, res, next) => {
  invalidateCache("/get-session")
  invalidateCache("/favoritos");
  invalidateCache("most-favorited");
  next()
}, taskControllers.changePassword)

router.put("/change-email", checkSession(), taskControllers.changeEmail)



router.delete("/delete-user", checkSession(), (req, res, next) => {
  invalidateCache("/get-session")
  invalidateCache("/favoritos")
  invalidateCache("/carrito-temp")
  next()
}, taskControllers.deleteUser)

// ── Stripe: Pasarela de pago ──────────────────────────────────────────────────
router.post("/create-checkout-session", checkSession(), taskControllers.createCheckoutSession)
router.post("/successPurchase", express.raw({ type: 'application/json' }), taskControllers.compraExitosa)
router.get("/compra-exitosa", checkSession(), taskControllers.compraExitosa)
router.get("/pago-completado",taskControllers.pagoCompletado)

router.post("/carrito", checkSession(), taskControllers.showCart)

export default router
