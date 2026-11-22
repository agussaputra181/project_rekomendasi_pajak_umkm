const express = require("express");
const article = require("../controllers/articleController");
const { protect, authorize, optionalAuth } = require("../middleware/auth");

const router = express.Router();
const adminOnly = [protect, authorize("admin")];

router.route("/").get(optionalAuth, article.listArticles).post(adminOnly, article.createArticle);
router.get("/:slug", optionalAuth, article.getArticle);
router.route("/:id").put(adminOnly, article.updateArticle).delete(adminOnly, article.deleteArticle);

module.exports = router;
