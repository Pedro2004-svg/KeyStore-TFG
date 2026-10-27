export class User{
    constructor({name, email}){
        this.user_name = name
        this.email = email
    }
}
export class Favourites{
    constructor({name, name_game, price, image}){
        this.user_name = name
        this.name_game = name_game
        this.price = price
        this.image = image
    }
}
export class Sales{
    constructor({name, name_game, price, offer}){
        this.user_name = name
        this.name_game = name_game
        this.price = price
        this.offer = offer
    }
}
export class Games{
    constructor({name_game, price, image}){
        this.name_game = name_game
        this.price = price
        this.image = image
    }
}