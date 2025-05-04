-- Insert subscription data
INSERT INTO "subscriptions" ("id", "name", "admin_id", "features", "description", "position", "price", "plan_type", "type", "created_at", "updated_at")
VALUES
(1, 'Gratis', 4, '{"form": 1, "video": 2, "project": 1, "remove_brand": false, "max_testimoni": 10, "showcase_page": 1, "unlimited_tag": true, "import_social_media": 5}', 'Untuk Hobi 📈', 0, 0, 'LIFETIME', 'free', '2025-02-21 18:31:33.59163', '2025-02-21 18:31:33.59163'),
(2, 'Pemula', 4, '{"form": 1, "video": 15, "project": 1, "remove_brand": true, "max_testimoni": 45, "showcase_page": 1, "unlimited_tag": true, "import_social_media": 25}', 'Untuk Profesional 📈', 45000, 'MONTHLY', 'premium', '2025-02-21 18:39:04.744766', '2025-02-21 18:39:04.744766'),
(3, 'Premium', 4, '{"form": 10, "video": 30, "project": 3, "remove_brand": true, "max_testimoni": 125, "showcase_page": 10, "unlimited_tag": true, "import_social_media": 75}', 'Untuk Tim Kecil 🏠', 100000, 'MONTHLY', 'premium', '2025-02-21 18:41:10.563054', '2025-02-21 18:41:10.563054'),
(4, 'Ultimate', 4, '{"form": 25, "video": 50, "project": 15, "remove_brand": true, "max_testimoni": 325, "showcase_page": 15, "unlimited_tag": true, "import_social_media": 150}', 'Untuk bisnis besar 🏠', 149000, 'MONTHLY', 'premium', '2025-02-21 18:45:40.034097', '2025-02-21 18:45:40.034097');

-- Reset sequence to continue after our manually inserted ids
SELECT setval(pg_get_serial_sequence('subscriptions', 'id'), (SELECT MAX(id) FROM subscriptions), true); 