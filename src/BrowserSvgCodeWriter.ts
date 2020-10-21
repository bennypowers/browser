import {
  EncodeHintType,
  IllegalArgumentException,
  IllegalStateException,
  QRCodeDecoderErrorCorrectionLevel,
  QRCodeEncoder,
  QRCodeEncoderQRCode,
} from '@zxing/library';

const svgNs = 'http://www.w3.org/2000/svg';

/**/
abstract class BrowserSvgCodeWriter {

  /**
   * Default quiet zone in pixels.
   */
  private static readonly QUIET_ZONE_SIZE = 4;

  /**
   * SVG markup NameSpace
   */
  private static readonly SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * A HTML container element for the image.
   */
  private containerElement: HTMLElement;

  /**
   * Constructs. 😉
   */
  public constructor(containerElement: string | HTMLElement) {
    if (typeof containerElement === 'string') {
      const container = document.getElementById(containerElement);
      if (!container) { throw new Error(`Could not find a Container element with '${containerElement}'.`); }

      this.containerElement = container;
    } else {
      this.containerElement = containerElement;
    }
  }

  /**
   * Writes the QR code to a SVG and renders it in the container.
   */
  public write(
    contents: string,
    width: number,
    height: number,
    hints?: Map<EncodeHintType, any>,
  ): SVGSVGElement {

    if (contents.length === 0) {
      throw new IllegalArgumentException('Found empty contents');
    }

    if (width < 0 || height < 0) {
      throw new IllegalArgumentException('Requested dimensions are too small: ' + width + 'x' + height);
    }

    const quietZone = hints && hints.get(EncodeHintType.MARGIN) !== undefined
      ? Number.parseInt(hints.get(EncodeHintType.MARGIN).toString(), 10)
      : BrowserSvgCodeWriter.QUIET_ZONE_SIZE;

    const code = this.encode(hints, contents);

    return this.renderResult(code, width, height, quietZone);
  }

  /**
   * Creates a SVG element.
   */
  protected createSVGElement(w: number, h: number): SVGSVGElement {

    const el = document.createElementNS(BrowserSvgCodeWriter.SVG_NS, 'svg');

    el.setAttributeNS(svgNs, 'width', h.toString());
    el.setAttributeNS(svgNs, 'height', w.toString());

    return el;
  }

  /**
   * Creates a SVG rect.
   */
  protected createSvgPathPlaceholderElement(w: number, h: number): SVGPathElement {

    const el = document.createElementNS(BrowserSvgCodeWriter.SVG_NS, 'path');

    el.setAttributeNS(svgNs, 'd', `M0 0h${w}v${h}H0z`);
    el.setAttributeNS(svgNs, 'fill', 'none');

    return el;
  }

  /**
   * Creates a SVG rect.
   */
  protected createSvgRectElement(x: number, y: number, w: number, h: number): SVGRectElement {

    const el = document.createElementNS(BrowserSvgCodeWriter.SVG_NS, 'rect');

    el.setAttributeNS(svgNs, 'x', x.toString());
    el.setAttributeNS(svgNs, 'y', y.toString());
    el.setAttributeNS(svgNs, 'height', w.toString());
    el.setAttributeNS(svgNs, 'width', h.toString());
    el.setAttributeNS(svgNs, 'fill', '#000000');

    return el;
  }

  /**
   * Encodes the content to a Barcode type.
   */
  private encode(hints: Map<EncodeHintType, any> | undefined, contents: string): QRCodeEncoderQRCode {

    let errorCorrectionLevel = QRCodeDecoderErrorCorrectionLevel.L;

    if (hints && hints.get(EncodeHintType.ERROR_CORRECTION) !== undefined) {
      const correctionStr = hints.get(EncodeHintType.ERROR_CORRECTION).toString();
      errorCorrectionLevel = QRCodeDecoderErrorCorrectionLevel.fromString(correctionStr);
    }

    const code = QRCodeEncoder.encode(contents, errorCorrectionLevel, hints);

    return code;
  }

  /**
   * Renders the SVG in the container.
   *
   * @note the input matrix uses 0 == white, 1 == black. The output matrix
   *  uses 0 == black, 255 == white (i.e. an 8 bit greyscale bitmap).
   */
  private renderResult(
    code: QRCodeEncoderQRCode, width: number /*int*/,
    height: number /*int*/,
    quietZone: number /*int*/,
  ): SVGSVGElement {

    // if (this.format && format != this.format) {
    //   throw new IllegalArgumentException("Can only encode QR_CODE, but got " + format)
    // }

    const input = code.getMatrix();

    if (input === null) {
      throw new IllegalStateException();
    }

    const inputWidth = input.getWidth();
    const inputHeight = input.getHeight();
    const qrWidth = inputWidth + (quietZone * 2);
    const qrHeight = inputHeight + (quietZone * 2);
    const outputWidth = Math.max(width, qrWidth);
    const outputHeight = Math.max(height, qrHeight);

    const multiple = Math.min(Math.floor(outputWidth / qrWidth), Math.floor(outputHeight / qrHeight));

    // Padding includes both the quiet zone and the extra white pixels to accommodate the requested
    // dimensions. For example, if input is 25x25 the QR will be 33x33 including the quiet zone.
    // If the requested size is 200x160, the multiple will be 4, for a QR of 132x132. These will
    // handle all the padding from 100x100 (the actual QR) up to 200x160.
    const leftPadding = Math.floor((outputWidth - (inputWidth * multiple)) / 2);
    const topPadding = Math.floor((outputHeight - (inputHeight * multiple)) / 2);

    const svgElement = this.createSVGElement(outputWidth, outputHeight);

    const placeholder = this.createSvgPathPlaceholderElement(width, height);

    svgElement.appendChild(placeholder);

    this.containerElement.appendChild(svgElement);

    // 2D loop
    for (let inputY = 0, outputY = topPadding; inputY < inputHeight; inputY++, outputY += multiple) {
      // Write the contents of this row of the barcode
      for (let inputX = 0, outputX = leftPadding; inputX < inputWidth; inputX++, outputX += multiple) {
        if (input.get(inputX, inputY) === 1) {
          const svgRectElement = this.createSvgRectElement(outputX, outputY, multiple, multiple);
          svgElement.appendChild(svgRectElement);
        }
      }
    }

    return svgElement;
  }
}

export { BrowserSvgCodeWriter };
