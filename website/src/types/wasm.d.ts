declare module '/wasm/ddex_parser_wasm.js' {
  export class DDEXParser {
    constructor();
    parse(xml: string, options?: any): any;
    parse_stream(stream: ReadableStream, options?: any): Promise<any>;
    version(): string;
    free(): void;
  }

  export default function init(wasmPath?: string): Promise<any>;
}

declare module '/wasm/ddex_builder_wasm.js' {
  export class WasmDdexBuilder {
    constructor();
    addRelease(release: Release): void;
    addResource(resource: Resource): void;
    build(): Promise<string>;
    buildWithFidelity(options?: any): Promise<any>;
    validate(): ValidationResult;
    getStats(): any;
    reset(): void;
    getAvailablePresets(): string[];
    applyPreset(presetName: string): void;
    free(): void;
  }

  export class Release {
    constructor(releaseId: string, releaseType: string, title: string, artist: string);
    release_id: string;
    release_type: string;
    title: string;
    artist: string;
    label?: string;
    catalog_number?: string;
    upc?: string;
    release_date?: string;
    genre?: string;
    parental_warning?: boolean;
    track_ids: string[];
    metadata: any;
  }

  export class Resource {
    constructor(resourceId: string, resourceType: string, title: string, artist: string);
    resource_id: string;
    resource_type: string;
    title: string;
    artist: string;
    isrc?: string;
    duration?: string;
    track_number?: number;
    volume_number?: number;
    metadata: any;
  }

  export class ValidationResult {
    constructor(isValid: boolean);
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }

  export function batchBuild(requests: any[]): Promise<string[]>;
  export function version(): string;
  export default function init(wasmPath?: string): Promise<any>;
}