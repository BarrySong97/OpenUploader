import type { Provider, FileItem } from './types'

export const mockProviders: Provider[] = [
  {
    id: '1',
    name: 'Aliyun OSS',
    type: 'aliyun',
    bucket: 'my-bucket',
    buckets: ['my-bucket', 'backup-bucket', 'static-assets', 'user-uploads'],
    selectedBucket: 'my-bucket',
    region: 'oss-cn-hangzhou',
    connected: true,
    stats: {
      files: 1234,
      storage: '2.5 GB'
    },
    createdAt: new Date('2024-01-10').toISOString()
  },
  {
    id: '2',
    name: 'AWS S3',
    type: 'aws',
    bucket: 'my-s3-bucket',
    buckets: ['my-s3-bucket', 'production-assets', 'dev-storage', 'logs-bucket'],
    selectedBucket: 'my-s3-bucket',
    region: 'us-east-1',
    connected: true,
    stats: {
      files: 567,
      storage: '1.2 GB'
    },
    createdAt: new Date('2024-01-15').toISOString()
  },
  {
    id: '3',
    name: 'Tencent COS',
    type: 'tencent',
    bucket: 'my-cos-bucket',
    buckets: ['my-cos-bucket', 'media-files', 'documents-storage'],
    selectedBucket: 'my-cos-bucket',
    region: 'ap-guangzhou',
    connected: false,
    stats: {
      files: 89,
      storage: '456 MB'
    },
    createdAt: new Date('2024-01-20').toISOString()
  },
  {
    id: '4',
    name: 'Qiniu Kodo',
    type: 'qiniu',
    bucket: 'my-qiniu-bucket',
    buckets: ['my-qiniu-bucket', 'cdn-assets', 'image-storage', 'video-bucket', 'archive'],
    selectedBucket: 'my-qiniu-bucket',
    region: 'z0',
    connected: true,
    stats: {
      files: 2341,
      storage: '5.8 GB'
    },
    createdAt: new Date('2024-01-25').toISOString()
  }
]

export const mockFiles: Record<string, Record<string, FileItem[]>> = {
  '1': {
    'my-bucket': [
      {
        id: 'f1',
        name: 'images',
        type: 'folder',
        modified: new Date('2024-01-15')
      },
      {
        id: 'f2',
        name: 'documents',
        type: 'folder',
        modified: new Date('2024-01-18')
      },
      {
        id: 'f3',
        name: 'report-2024.pdf',
        type: 'file',
        size: 1024000,
        modified: new Date('2024-01-20'),
        mimeType: 'application/pdf',
        url: 'https://example.com/report-2024.pdf'
      },
      {
        id: 'f4',
        name: 'presentation.pptx',
        type: 'file',
        size: 2048000,
        modified: new Date('2024-01-22'),
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        url: 'https://example.com/presentation.pptx'
      },
      {
        id: 'f5',
        name: 'data.xlsx',
        type: 'file',
        size: 512000,
        modified: new Date('2024-01-25'),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        url: 'https://example.com/data.xlsx'
      },
      {
        id: 'f6',
        name: 'logo.png',
        type: 'file',
        size: 128000,
        modified: new Date('2024-01-28'),
        mimeType: 'image/png',
        url: 'https://example.com/logo.png'
      }
    ],
    'backup-bucket': [
      {
        id: 'b1',
        name: 'backups',
        type: 'folder',
        modified: new Date('2024-01-10')
      },
      {
        id: 'b2',
        name: 'backup-2024-01.zip',
        type: 'file',
        size: 52428800,
        modified: new Date('2024-01-15'),
        mimeType: 'application/zip',
        url: 'https://example.com/backup-2024-01.zip'
      },
      {
        id: 'b3',
        name: 'database-dump.sql',
        type: 'file',
        size: 10485760,
        modified: new Date('2024-01-20'),
        mimeType: 'application/sql',
        url: 'https://example.com/database-dump.sql'
      }
    ],
    'static-assets': [
      {
        id: 's1',
        name: 'css',
        type: 'folder',
        modified: new Date('2024-01-05')
      },
      {
        id: 's2',
        name: 'js',
        type: 'folder',
        modified: new Date('2024-01-05')
      },
      {
        id: 's3',
        name: 'style.css',
        type: 'file',
        size: 51200,
        modified: new Date('2024-01-10'),
        mimeType: 'text/css',
        url: 'https://example.com/style.css'
      },
      {
        id: 's4',
        name: 'app.js',
        type: 'file',
        size: 204800,
        modified: new Date('2024-01-12'),
        mimeType: 'application/javascript',
        url: 'https://example.com/app.js'
      }
    ],
    'user-uploads': [
      {
        id: 'u1',
        name: 'avatars',
        type: 'folder',
        modified: new Date('2024-01-20')
      },
      {
        id: 'u2',
        name: 'profile-pic.jpg',
        type: 'file',
        size: 256000,
        modified: new Date('2024-01-22'),
        mimeType: 'image/jpeg',
        url: 'https://example.com/profile-pic.jpg'
      },
      {
        id: 'u3',
        name: 'document.pdf',
        type: 'file',
        size: 1024000,
        modified: new Date('2024-01-25'),
        mimeType: 'application/pdf',
        url: 'https://example.com/document.pdf'
      }
    ]
  },
  '2': {
    'my-s3-bucket': [
      {
        id: 'f7',
        name: 'backups',
        type: 'folder',
        modified: new Date('2024-01-10')
      },
      {
        id: 'f8',
        name: 'archive.zip',
        type: 'file',
        size: 10240000,
        modified: new Date('2024-01-12'),
        mimeType: 'application/zip',
        url: 'https://example.com/archive.zip'
      },
      {
        id: 'f9',
        name: 'readme.txt',
        type: 'file',
        size: 4096,
        modified: new Date('2024-01-14'),
        mimeType: 'text/plain',
        url: 'https://example.com/readme.txt'
      }
    ],
    'production-assets': [
      {
        id: 'p1',
        name: 'images',
        type: 'folder',
        modified: new Date('2024-01-08')
      },
      {
        id: 'p2',
        name: 'banner.jpg',
        type: 'file',
        size: 512000,
        modified: new Date('2024-01-10'),
        mimeType: 'image/jpeg',
        url: 'https://example.com/banner.jpg'
      },
      {
        id: 'p3',
        name: 'hero.png',
        type: 'file',
        size: 768000,
        modified: new Date('2024-01-12'),
        mimeType: 'image/png',
        url: 'https://example.com/hero.png'
      }
    ],
    'dev-storage': [
      {
        id: 'd1',
        name: 'test-data',
        type: 'folder',
        modified: new Date('2024-01-15')
      },
      {
        id: 'd2',
        name: 'sample.json',
        type: 'file',
        size: 8192,
        modified: new Date('2024-01-18'),
        mimeType: 'application/json',
        url: 'https://example.com/sample.json'
      }
    ],
    'logs-bucket': [
      {
        id: 'l1',
        name: 'application.log',
        type: 'file',
        size: 2048000,
        modified: new Date('2024-01-28'),
        mimeType: 'text/plain',
        url: 'https://example.com/application.log'
      },
      {
        id: 'l2',
        name: 'error.log',
        type: 'file',
        size: 512000,
        modified: new Date('2024-01-28'),
        mimeType: 'text/plain',
        url: 'https://example.com/error.log'
      }
    ]
  },
  '3': {
    'my-cos-bucket': [
      {
        id: 'f10',
        name: 'videos',
        type: 'folder',
        modified: new Date('2024-01-05')
      },
      {
        id: 'f11',
        name: 'intro.mp4',
        type: 'file',
        size: 52428800,
        modified: new Date('2024-01-08'),
        mimeType: 'video/mp4',
        url: 'https://example.com/intro.mp4'
      }
    ],
    'media-files': [
      {
        id: 'm1',
        name: 'audio',
        type: 'folder',
        modified: new Date('2024-01-12')
      },
      {
        id: 'm2',
        name: 'video',
        type: 'folder',
        modified: new Date('2024-01-12')
      },
      {
        id: 'm3',
        name: 'podcast.mp3',
        type: 'file',
        size: 10485760,
        modified: new Date('2024-01-15'),
        mimeType: 'audio/mpeg',
        url: 'https://example.com/podcast.mp3'
      }
    ],
    'documents-storage': [
      {
        id: 'ds1',
        name: 'contracts',
        type: 'folder',
        modified: new Date('2024-01-10')
      },
      {
        id: 'ds2',
        name: 'agreement.pdf',
        type: 'file',
        size: 2048000,
        modified: new Date('2024-01-15'),
        mimeType: 'application/pdf',
        url: 'https://example.com/agreement.pdf'
      }
    ]
  },
  '4': {
    'my-qiniu-bucket': [
      {
        id: 'f12',
        name: 'assets',
        type: 'folder',
        modified: new Date('2024-01-01')
      },
      {
        id: 'f13',
        name: 'config.json',
        type: 'file',
        size: 2048,
        modified: new Date('2024-01-03'),
        mimeType: 'application/json',
        url: 'https://example.com/config.json'
      },
      {
        id: 'f14',
        name: 'banner.jpg',
        type: 'file',
        size: 256000,
        modified: new Date('2024-01-05'),
        mimeType: 'image/jpeg',
        url: 'https://example.com/banner.jpg'
      }
    ],
    'cdn-assets': [
      {
        id: 'c1',
        name: 'fonts',
        type: 'folder',
        modified: new Date('2024-01-08')
      },
      {
        id: 'c2',
        name: 'icons',
        type: 'folder',
        modified: new Date('2024-01-08')
      },
      {
        id: 'c3',
        name: 'main.css',
        type: 'file',
        size: 102400,
        modified: new Date('2024-01-10'),
        mimeType: 'text/css',
        url: 'https://example.com/main.css'
      }
    ],
    'image-storage': [
      {
        id: 'i1',
        name: 'products',
        type: 'folder',
        modified: new Date('2024-01-12')
      },
      {
        id: 'i2',
        name: 'product-1.jpg',
        type: 'file',
        size: 384000,
        modified: new Date('2024-01-15'),
        mimeType: 'image/jpeg',
        url: 'https://example.com/product-1.jpg'
      },
      {
        id: 'i3',
        name: 'product-2.jpg',
        type: 'file',
        size: 420000,
        modified: new Date('2024-01-16'),
        mimeType: 'image/jpeg',
        url: 'https://example.com/product-2.jpg'
      }
    ],
    'video-bucket': [
      {
        id: 'v1',
        name: 'tutorials',
        type: 'folder',
        modified: new Date('2024-01-18')
      },
      {
        id: 'v2',
        name: 'tutorial-1.mp4',
        type: 'file',
        size: 104857600,
        modified: new Date('2024-01-20'),
        mimeType: 'video/mp4',
        url: 'https://example.com/tutorial-1.mp4'
      }
    ],
    'archive': [
      {
        id: 'a1',
        name: 'old-files',
        type: 'folder',
        modified: new Date('2024-01-01')
      },
      {
        id: 'a2',
        name: 'archive-2023.zip',
        type: 'file',
        size: 209715200,
        modified: new Date('2024-01-05'),
        mimeType: 'application/zip',
        url: 'https://example.com/archive-2023.zip'
      }
    ]
  }
}
