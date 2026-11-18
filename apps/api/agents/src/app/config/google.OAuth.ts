import {google} from "googleapis"
export const oauthclient=new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)

export const scopes =[
    "openid",
    "gmail","profile",`https://www.googleapis.com/auth/calender.events`,
    `https://www.googleapis.com/auth/calender.readonly`,
    `https://www.goggleapis.com/auth/gmail.send`,
    `https://www.goggleapis.com/auth/gmail.readonly`
]