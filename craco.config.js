module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Fix CSS import issues in Jest
      webpackConfig.module.rules.push({
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
        include: /\.module\.css$/,
      });
      
      // Handle regular CSS files
      webpackConfig.module.rules.push({
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
        exclude: /\.module\.css$/,
      });
      
      return webpackConfig;
    },
  },
}