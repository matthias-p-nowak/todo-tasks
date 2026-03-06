dist_dir := "dist"

# Generate icon PNGs from icon.svg
icons:
    rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
    rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
    rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png

# Copy production files to dist/
dist:
    mkdir -p {{dist_dir}}
    cp index.html api.php db.php .htaccess manifest.json {{dist_dir}}/
    cp apple-touch-icon.png icon-192.png icon-512.png {{dist_dir}}/
    cp app.js main.css {{dist_dir}}/
    -cp app.js.map main.css.map {{dist_dir}}/

# Remove dist/
clean:
    rm -rf {{dist_dir}}
