# NubDB Documentation Website

Modern, responsive documentation website for NubDB.

## Features

- 🎨 Modern, clean design with gradient hero
- 📱 Fully responsive (mobile, tablet, desktop)
- 🌙 Dark/light themed sections
- 💻 Syntax highlighting for code examples
- 📋 Copy-to-clipboard for code blocks
- 🎯 Smooth scrolling navigation
- ⚡ Fast and lightweight
- 🔍 SEO optimized

## Files

- `index.html` - Main documentation page
- `style.css` - Stylesheet with responsive design
- `script.js` - Interactive features and animations

## Sections

1. **Hero** - Eye-catching introduction with key metrics
2. **Features** - 8 core features with icons
3. **Quick Start** - Tabbed installation guides (Docker, Compose, Source, K8s)
4. **Docker Integration** - Web network setup and multi-service examples
5. **API Reference** - Complete command documentation
6. **Code Examples** - Client libraries in Python, Node.js, Go, Rust
7. **Performance** - Benchmark results and latency metrics
8. **Resources** - Links to guides and documentation

## Local Development

### Option 1: Python HTTP Server

```bash
cd docs
python3 -m http.server 8000
# Open http://localhost:8000
```

### Option 2: Node.js HTTP Server

```bash
cd docs
npx http-server -p 8000
# Open http://localhost:8000
```

### Option 3: PHP Server

```bash
cd docs
php -S localhost:8000
# Open http://localhost:8000
```

## Deployment

### GitHub Pages

1. Push to GitHub repository
2. Go to Settings → Pages
3. Select source: `main` branch, `/docs` folder
4. Your site will be at: `https://nub-coders.github.io/nubdt/`

### Netlify

```bash
# netlify.toml
[build]
  publish = "docs"
```

Drag and drop the `docs` folder to Netlify dashboard.

### Vercel

```bash
# vercel.json
{
  "buildCommand": "echo 'Static site'",
  "outputDirectory": "docs"
}
```

### Docker

```dockerfile
FROM nginx:alpine
COPY docs /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build -t nubdb-docs .
docker run -d -p 8080:80 nubdb-docs
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name docs.nubdb.io;
    
    root /var/www/nubdb-docs;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Customization

### Colors

Edit `style.css` CSS variables:

```css
:root {
    --primary: #6366f1;
    --secondary: #10b981;
    --bg-light: #f9fafb;
    --bg-dark: #111827;
}
```

### Content

Edit `index.html` to modify content, add sections, or change text.

### JavaScript

Edit `script.js` to add new interactive features or modify behavior.

## Dependencies

External CDN libraries (no installation needed):

- **Highlight.js** - Syntax highlighting for code blocks
  - Version: 11.9.0
  - Theme: GitHub Dark

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Performance

- **Page Size**: ~50KB (HTML + CSS + JS)
- **Load Time**: <1s on fast connection
- **First Paint**: <500ms
- **Lighthouse Score**: 95+

## SEO

- Semantic HTML5
- Meta descriptions
- Open Graph tags ready
- Mobile-friendly
- Fast load times

## Accessibility

- ARIA labels
- Keyboard navigation
- Screen reader friendly
- High contrast ratios
- Focus indicators

## License

Same as NubDB project - MIT License

## Contributing

To improve the documentation:

1. Edit the HTML/CSS/JS files
2. Test locally
3. Submit a pull request

## Support

For issues or suggestions:
- GitHub Issues: https://github.com/nub-coders/nubdt/issues
- Documentation: https://github.com/nub-coders/nubdt/blob/main/README.md
