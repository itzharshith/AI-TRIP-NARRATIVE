const fs = require('fs');

const routes = [
  'src/app/api/admin/data/[id]/route.ts',
  'src/app/api/admin/users/[uid]/role/route.ts',
  'src/app/api/admin/users/[uid]/status/route.ts',
  'src/app/api/explore/[id]/share/route.ts',
  'src/app/api/explore/[id]/view/route.ts',
  'src/app/api/feedback/[id]/route.ts',
  'src/app/api/history/[id]/route.ts',
  'src/app/api/history/[id]/restore/route.ts',
  'src/app/api/photos/single/[photoId]/route.ts',
  'src/app/api/photos/[narrativeId]/route.ts',
  'src/app/api/ratings/[id]/route.ts',
  'src/app/api/reports/[id]/route.ts',
  'src/app/api/wishlist/[id]/route.ts',
  'src/app/api/wishlist/[id]/status/route.ts',
];

const header = "export const dynamic = 'force-dynamic';\n\n";

routes.forEach(p => {
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    if (!c.includes('force-dynamic')) {
      fs.writeFileSync(p, header + c, 'utf8');
      console.log('Fixed:', p);
    } else {
      console.log('Already OK:', p);
    }
  } else {
    console.log('Not found:', p);
  }
});
