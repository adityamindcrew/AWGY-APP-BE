export const refreshTokenExpiration = new Date()
refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 14)

export const getTwoMinutesFromNow = () => {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export const updateClientInfo = (user: any, clientInfo: any) => {
    if (!clientInfo) {
        console.error("Client info is undefined in updateClientInfo function")
        return user
    }

    user.clientInfo = {
        isStaging: clientInfo.isStaging === "true",
        deviceid: clientInfo.deviceid,
        camefrom: clientInfo.camefrom.toLowerCase() === "ios" ? "ios" : "android",
        appversion: clientInfo.appversion,
        lastUpdated: new Date(),
    }
    return user
}