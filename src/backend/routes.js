import express from "express";
import { getPipelines } from "./github.js";

const router = express.Router();

router.get("/github/pipelines", getPipelines);

export default router;
