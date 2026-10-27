export default class task_controllers {
    static paginaPrincipal(req, res) {
        res.render("completes/index");
    }

    static paginaLogin(req, res) {
        res.render("completes/login");
    }

    static paginaRegistro(req, res) {
        res.render("completes/register");
    }

    static paginaFavoritos(req, res) {
        res.render("completes/favourites");
    }

    static paginaCarrito(req, res) { 
        res.render("completes/cart");
    }

    static paginaPerfil(req, res) {
        res.render("completes/userProfile");
    }

    static paginaCompra(req, res) {
        res.render("completes/successPurchase");
    }
}


