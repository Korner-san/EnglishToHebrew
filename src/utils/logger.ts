/**
 * Enhanced logging utilities with colored output
 */

export class Logger {
  /**
   * Log success message with checkmark
   */
  static success(message: string): void {
    console.log(`✅ ${message}`);
  }

  /**
   * Log error message with X mark
   */
  static error(message: string, error?: any): void {
    console.error(`❌ ${message}`);
    if (error) {
      console.error('   Error details:', error);
    }
  }

  /**
   * Log warning message
   */
  static warning(message: string): void {
    console.warn(`⚠️  ${message}`);
  }

  /**
   * Log info message
   */
  static info(message: string): void {
    console.log(`ℹ️  ${message}`);
  }

  /**
   * Log progress message
   */
  static progress(message: string): void {
    console.log(`🔄 ${message}`);
  }

  /**
   * Log file operation
   */
  static file(message: string): void {
    console.log(`📄 ${message}`);
  }

  /**
   * Log separator line
   */
  static separator(char: string = '=', length: number = 60): void {
    console.log(char.repeat(length));
  }

  /**
   * Log section header
   */
  static section(title: string, step?: number): void {
    if (step) {
      console.log(`\n📋 Step ${step}: ${title}`);
    } else {
      console.log(`\n📋 ${title}`);
    }
  }

  /**
   * Log completion message
   */
  static complete(message: string): void {
    console.log(`\n🎉 ${message}\n`);
  }

  /**
   * Log waiting/delay message
   */
  static wait(message: string): void {
    console.log(`⏳ ${message}`);
  }

  /**
   * Log cleanup message
   */
  static cleanup(message: string): void {
    console.log(`🧹 ${message}`);
  }
}

