export interface ICookieMap {
    [cookieName: string]: ICookie
}

export interface ICookie {
    name: string,
    value: string,
    path?: string,
    expires?: string,
    domain?: string,
    secure?: boolean,
    HttpOnly?: boolean
}