import { Router } from "express";
import { checkPageController } from "../controllers/pagePulseController.js";

const router = Router();

router.post("/", checkPageController);

export default router;