import express from "express"
import { addUpdateProfilePicture, getProfile, UpdateProfileInfo } from "../controller/profileController"
import { handleMulterError, uploadProfilePictureMulter } from "../middleware/fileUpload"
import { validateRequestParams } from "../middleware/requestValidator"


const router = express.Router()
router.put("/update-profile", UpdateProfileInfo)

router.post(
    "/profile-picture",
    uploadProfilePictureMulter,
    handleMulterError,
    validateRequestParams,
    addUpdateProfilePicture
)

router.get("/", getProfile)

export default router
