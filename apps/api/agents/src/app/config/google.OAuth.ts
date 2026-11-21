import {google} from "googleapis"
export const createOAuthClient = () => new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
)

const identityScopes = [
    "openid",
    "email", "profile",
];

export const googleScopesFor = (service: "gmail" | "calendar") => [
    ...identityScopes,
    ...(service === "gmail" ? [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
    ] : [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    ]),
];
