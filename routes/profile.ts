import express from "express"
import { addUpdateProfilePicture, getProfile, UpdateProfileInfo } from "../controller/profileController"
import { handleMulterError, uploadProfilePictureMulter } from "../middleware/fileUpload"
import { validateRequestParams } from "../middleware/requestValidator"


const router = express.Router()
router.put("/updateprofile", UpdateProfileInfo)

router.post(
    "/profilepicture",
    uploadProfilePictureMulter,
    handleMulterError,
    validateRequestParams,
    addUpdateProfilePicture
)

router.get("/", getProfile)

export default router
