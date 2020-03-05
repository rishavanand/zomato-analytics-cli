export interface IOTP {
    status: string,
    message: string
}

export interface ILoginRespose {
    status: string,
    name: string,
    isNew: Boolean,
    user_id: number,
    message?: string
}

export interface IOrder {
    status: string,
    restaurant: string,
    restaurantId: string,
    city: string,
    orderNumber: number,
    cost: number,
    date: Date
}