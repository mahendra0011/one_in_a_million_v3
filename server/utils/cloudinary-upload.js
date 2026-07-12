import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import https from 'https';

// Direct Cloudinary configuration
cloudinary.config({
  cloud_name: 'dsjxrospe',
  api_key: '993383116366593',
  api_secret: '6_G2jIHA-kbTUlcFiRySu9fgK2E',
});

console.log('Cloudinary Config Loaded');

// High-quality burger images from Unsplash (free to use)
const burgerImages = [
  {
    id: 'paneer-makhani',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    filename: 'paneer-makhani.jpg',
  },
  {
    id: 'million-classic',
    url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80',
    filename: 'classic-beef.jpg',
  },
  {
    id: 'crispy-chicken-burger',
    url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&q=80',
    filename: 'crispy-chicken.jpg',
  },
  {
    id: 'veg-crunch-stack',
    url: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=800&q=80',
    filename: 'veg-crunch.jpg',
  },
  {
    id: 'smoky-bbq-beef',
    url: 'https://images.unsplash.com/photo-1594212699903-cc8cbf39dfda?w=800&q=80',
    filename: 'smoky-bbq.jpg',
  },
  {
    id: 'zinger-spicy',
    url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80',
    filename: 'zinger-spicy.jpg',
  },
  {
    id: 'mushroom-swiss',
    url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&q=80',
    filename: 'mushroom-swiss.jpg',
  },
  {
    id: 'double-smash',
    url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80',
    filename: 'double-smash.jpg',
  },
  {
    id: 'strip-cravings',
    url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80',
    filename: 'strips.jpg',
  },
  {
    id: 'crispy-bites',
    url: 'https://images.unsplash.com/photo-1534256958597-7fe685cbd745?w=800&q=80',
    filename: 'cheese-bites.jpg',
  },
  {
    id: 'loaded-fries',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80',
    filename: 'loaded-fries.jpg',
  },
  {
    id: 'onion-rings',
    url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80',
    filename: 'onion-rings.jpg',
  },
  {
    id: 'oreo-shake',
    url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80',
    filename: 'oreo-shake.jpg',
  },
  {
    id: 'green-cooler',
    url: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=800&q=80',
    filename: 'mint-cooler.jpg',
  },
  {
    id: 'mango-lassi',
    url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&q=80',
    filename: 'mango-lassi.jpg',
  },
  {
    id: 'cola-float',
    url: 'https://images.unsplash.com/photo-1563539256203-c7e78a7e5e2a?w=800&q=80',
    filename: 'cola-float.jpg',
  },
  {
    id: 'million-meal',
    url: 'https://images.unsplash.com/photo-1594212699903-cc8cbf39dfda?w=800&q=80',
    filename: 'combo-meal.jpg',
  },
  {
    id: 'family-feast',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    filename: 'family-feast.jpg',
  },
  {
    id: 'couple-combo',
    url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
    filename: 'couple-combo.jpg',
  },
];

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

async function uploadToCloudinary(imagePath, productId) {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'one in a million/images',
      public_id: productId,
      overwrite: true,
      transformation: [
        { width: 800, height: 600, crop: 'fill', quality: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading ${productId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting image upload to Cloudinary...\n');

  const uploadResults = [];

  for (const image of burgerImages) {
    try {
      console.log(`📥 Downloading ${image.filename}...`);
      const localPath = `./temp-${image.filename}`;
      await downloadImage(image.url, localPath);

      console.log(`☁️  Uploading ${image.id} to Cloudinary...`);
      const cloudinaryUrl = await uploadToCloudinary(localPath, image.id);

      if (cloudinaryUrl) {
        uploadResults.push({
          id: image.id,
          url: cloudinaryUrl,
        });
        console.log(`✅ ${image.id} - ${cloudinaryUrl}\n`);
      }

      // Cleanup temp file
      fs.unlinkSync(localPath);
    } catch (error) {
      console.error(`❌ Failed to process ${image.id}:`, error.message);
    }
  }

  // Save results to JSON
  fs.writeFileSync('cloudinary-images.json', JSON.stringify(uploadResults, null, 2));
  console.log('\n✨ Upload complete! Results saved to cloudinary-images.json');
  console.log('\nUpdate products.js with these URLs:');
  uploadResults.forEach(result => {
    console.log(`${result.id}: ${result.url}`);
  });
}

main().catch(console.error);