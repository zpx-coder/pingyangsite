-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_zh` VARCHAR(200) NOT NULL,
    `name_en` VARCHAR(200) NOT NULL,
    `icon_url` VARCHAR(255) NULL,
    `intro_zh` VARCHAR(500) NULL,
    `intro_en` VARCHAR(500) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `machine_fields` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_zh` VARCHAR(200) NOT NULL,
    `name_en` VARCHAR(200) NOT NULL,
    `logo_url` VARCHAR(255) NULL,
    `cover_url` VARCHAR(255) NULL,
    `founded_year` INTEGER NULL,
    `scale` VARCHAR(100) NULL,
    `address` VARCHAR(500) NULL,
    `contact_name` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `website` VARCHAR(255) NULL,
    `intro_zh` TEXT NULL,
    `intro_en` TEXT NULL,
    `honor_images` TEXT NOT NULL,
    `machine_fields` TEXT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_categories` (
    `company_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    PRIMARY KEY (`company_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `company_id` INTEGER NULL,
    `name_zh` VARCHAR(200) NOT NULL,
    `name_en` VARCHAR(200) NOT NULL,
    `main_image` VARCHAR(255) NULL,
    `images` TEXT NOT NULL,
    `intro_zh` TEXT NULL,
    `intro_en` TEXT NULL,
    `detail_zh` TEXT NULL,
    `detail_en` TEXT NULL,
    `price_ref` VARCHAR(100) NULL,
    `moq` VARCHAR(100) NULL,
    `machine_fields` TEXT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 0,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_category_id_status_sort_idx`(`category_id`, `status`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title_zh` VARCHAR(200) NOT NULL,
    `title_en` VARCHAR(200) NOT NULL,
    `cover_url` VARCHAR(255) NULL,
    `summary_zh` VARCHAR(500) NULL,
    `summary_en` VARCHAR(500) NULL,
    `content_zh` TEXT NULL,
    `content_en` TEXT NULL,
    `publish_time` DATETIME(3) NULL,
    `is_top` BOOLEAN NOT NULL DEFAULT false,
    `status` INTEGER NOT NULL DEFAULT 0,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `news_publish_time_status_is_top_idx`(`publish_time`, `status`, `is_top`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NULL,
    `company_id` INTEGER NULL,
    `product_name_snapshot` VARCHAR(200) NULL,
    `company_name_snapshot` VARCHAR(200) NULL,
    `name` VARCHAR(100) NOT NULL,
    `company_name` VARCHAR(200) NULL,
    `country` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `content` TEXT NOT NULL,
    `lang` VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
    `status` INTEGER NOT NULL DEFAULT 0,
    `ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inquiries_created_at_status_idx`(`created_at`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_contents` (
    `key` VARCHAR(191) NOT NULL,
    `config` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_categories` ADD CONSTRAINT `company_categories_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_categories` ADD CONSTRAINT `company_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
