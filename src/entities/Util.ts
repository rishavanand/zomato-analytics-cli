export interface IBarPrinterInput {
    label: string,
    value: number,
    count: number
}

export interface IBarPrinterParam {
    [key: string]: {
        count: number,
        total: number
    }
}