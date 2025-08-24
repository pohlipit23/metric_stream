/**
 * Format Handlers for Different Chart Output Formats
 * Handles PNG, SVG, and HTML format generation and processing
 */

/**
 * Format Handler class
 */
export class FormatHandler {
  constructor(env) {
    this.env = env;
  }

  /**
   * Process chart data based on output format
   * @param {string|Buffer} chartData - Raw chart data
   * @param {string} outputFormat - Target format
   * @param {Object} metadata - Chart metadata
   * @returns {Object} - Processed result
   */
  async processFormat(chartData, outputFormat, metadata) {
    try {
      switch (outputFormat) {
        case 'png':
          return await this.processPNG(chartData, metadata);
        case 'svg':
          return await this.processSVG(chartData, metadata);
        case 'html':
          return await this.processHTML(chartData, metadata);
        default:
          throw new Error(`Unsupported output format: ${outputFormat}`);
      }
    } catch (error) {
      console.error('Format processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process PNG format
   * @param {string|Buffer} chartData - Chart data
   * @param {Object} metadata - Chart metadata
   * @returns {Object} - Processed PNG result
   */
  async processPNG(chartData, metadata) {
    try {
      let pngBuffer;

      if (typeof chartData === 'string') {
        // If base64 encoded
        if (chartData.startsWith('data:image/png;base64,')) {
          const base64Data = chartData.split(',')[1];
          pngBuffer = this.base64ToBuffer(base64Data);
        } else {
          // Assume it's base64 without prefix
          pngBuffer = this.base64ToBuffer(chartData);
        }
      } else if (chartData instanceof ArrayBuffer || Buffer.isBuffer(chartData)) {
        pngBuffer = chartData;
      } else {
        throw new Error('Invalid PNG data format');
      }

      // Validate PNG header
      if (!this.isPNGBuffer(pngBuffer)) {
        throw new Error('Invalid PNG data');
      }

      return {
        success: true,
        data: pngBuffer,
        contentType: 'image/png',
        size: pngBuffer.byteLength,
        metadata: {
          ...metadata,
          format: 'png',
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('PNG processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process SVG format
   * @param {string} chartData - SVG data
   * @param {Object} metadata - Chart metadata
   * @returns {Object} - Processed SVG result
   */
  async processSVG(chartData, metadata) {
    try {
      let svgContent;

      if (typeof chartData === 'string') {
        svgContent = chartData;
      } else {
        // Convert buffer to string
        svgContent = new TextDecoder().decode(chartData);
      }

      // Validate SVG content
      if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
        throw new Error('Invalid SVG content');
      }

      // Optimize SVG (remove unnecessary whitespace, comments)
      const optimizedSVG = this.optimizeSVG(svgContent);

      return {
        success: true,
        data: optimizedSVG,
        contentType: 'image/svg+xml',
        size: optimizedSVG.length,
        metadata: {
          ...metadata,
          format: 'svg',
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('SVG processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process HTML format
   * @param {string} chartData - HTML data
   * @param {Object} metadata - Chart metadata
   * @returns {Object} - Processed HTML result
   */
  async processHTML(chartData, metadata) {
    try {
      let htmlContent;

      if (typeof chartData === 'string') {
        htmlContent = chartData;
      } else {
        htmlContent = new TextDecoder().decode(chartData);
      }

      // Validate HTML content
      if (!htmlContent.includes('<html') && !htmlContent.includes('<div')) {
        throw new Error('Invalid HTML content');
      }

      // Enhance HTML with additional features
      const enhancedHTML = this.enhanceHTML(htmlContent, metadata);

      return {
        success: true,
        data: enhancedHTML,
        contentType: 'text/html',
        size: enhancedHTML.length,
        metadata: {
          ...metadata,
          format: 'html',
          interactive: true,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('HTML processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert base64 to buffer
   * @param {string} base64 - Base64 string
   * @returns {ArrayBuffer} - Buffer
   */
  base64ToBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check if buffer is valid PNG
   * @param {ArrayBuffer} buffer - Buffer to check
   * @returns {boolean} - True if valid PNG
   */
  isPNGBuffer(buffer) {
    const view = new Uint8Array(buffer);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    
    if (view.length < 8) return false;
    
    for (let i = 0; i < 8; i++) {
      if (view[i] !== pngSignature[i]) return false;
    }
    
    return true;
  }

  /**
   * Optimize SVG content
   * @param {string} svgContent - SVG content
   * @returns {string} - Optimized SVG
   */
  optimizeSVG(svgContent) {
    return svgContent
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove unnecessary whitespace
      .replace(/>\s+</g, '><')
      // Remove empty attributes
      .replace(/\s+[a-zA-Z-]+=""/g, '')
      // Trim
      .trim();
  }

  /**
   * Enhance HTML with additional features
   * @param {string} htmlContent - HTML content
   * @param {Object} metadata - Chart metadata
   * @returns {string} - Enhanced HTML
   */
  enhanceHTML(htmlContent, metadata) {
    // Add metadata and additional features
    const enhancements = `
    <script>
      // Chart metadata
      window.chartMetadata = ${JSON.stringify(metadata)};
      
      // Add download functionality
      function downloadChart(format) {
        const chartId = window.chartMetadata.chartId || 'chart';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = \`\${chartId}-\${timestamp}.\${format}\`;
        
        if (format === 'png') {
          // Convert to PNG using canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const svg = document.querySelector('svg');
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            img.onload = function() {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              });
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
          }
        } else if (format === 'svg') {
          const svg = document.querySelector('svg');
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }
      
      // Add toolbar if not present
      if (!document.querySelector('.chart-toolbar')) {
        const toolbar = document.createElement('div');
        toolbar.className = 'chart-toolbar';
        toolbar.style.cssText = \`
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.9);
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
        \`;
        toolbar.innerHTML = \`
          <button onclick="downloadChart('png')" style="margin-right: 5px;">Download PNG</button>
          <button onclick="downloadChart('svg')">Download SVG</button>
        \`;
        document.body.appendChild(toolbar);
      }
    </script>
    
    <style>
      .chart-toolbar button {
        padding: 5px 10px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      }
      .chart-toolbar button:hover {
        background: #f0f0f0;
      }
    </style>`;

    // Insert enhancements before closing body tag
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', enhancements + '</body>');
    } else {
      return htmlContent + enhancements;
    }
  }

  /**
   * Get format capabilities
   * @param {string} outputFormat - Output format
   * @returns {Object} - Format capabilities
   */
  getFormatCapabilities(outputFormat) {
    const capabilities = {
      png: {
        interactive: false,
        scalable: false,
        fileSize: 'medium',
        quality: 'high',
        browserSupport: 'universal',
        printQuality: 'excellent'
      },
      svg: {
        interactive: false,
        scalable: true,
        fileSize: 'small',
        quality: 'vector',
        browserSupport: 'modern',
        printQuality: 'excellent'
      },
      html: {
        interactive: true,
        scalable: true,
        fileSize: 'large',
        quality: 'vector',
        browserSupport: 'modern',
        printQuality: 'good'
      }
    };

    return capabilities[outputFormat] || null;
  }

  /**
   * Convert between formats
   * @param {string|Buffer} sourceData - Source data
   * @param {string} sourceFormat - Source format
   * @param {string} targetFormat - Target format
   * @returns {Object} - Conversion result
   */
  async convertFormat(sourceData, sourceFormat, targetFormat) {
    try {
      if (sourceFormat === targetFormat) {
        return {
          success: true,
          data: sourceData,
          message: 'No conversion needed'
        };
      }

      // Implement format conversion logic
      // This would require more complex conversion utilities
      
      return {
        success: false,
        error: `Conversion from ${sourceFormat} to ${targetFormat} not implemented`
      };

    } catch (error) {
      console.error('Format conversion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}