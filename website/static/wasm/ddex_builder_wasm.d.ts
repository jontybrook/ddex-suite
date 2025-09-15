/* tslint:disable */
/* eslint-disable */
export function main(): void;
export function batchBuild(requests: any): Promise<string[]>;
export function validateStructure(xml: string): ValidationResult;
export function version(): string;
export class BuildResult {
  free(): void;
  constructor(xml: string);
  xml: string;
  get statistics(): BuildStatistics | undefined;
  set statistics(value: BuildStatistics | null | undefined);
  get verification(): VerificationResult | undefined;
  set verification(value: VerificationResult | null | undefined);
}
export class BuildStatistics {
  free(): void;
  constructor(build_time_ms: number, memory_used_bytes: number, xml_size_bytes: number, element_count: number, attribute_count: number, namespace_count: number, extension_count: number, canonicalization_time_ms: number);
  build_time_ms: number;
  memory_used_bytes: number;
  xml_size_bytes: number;
  element_count: number;
  attribute_count: number;
  namespace_count: number;
  extension_count: number;
  canonicalization_time_ms: number;
  get verification_time_ms(): number | undefined;
  set verification_time_ms(value: number | null | undefined);
}
export class BuilderStats {
  free(): void;
  constructor();
  releases_count: number;
  resources_count: number;
  total_build_time_ms: number;
  last_build_size_bytes: number;
  validation_errors: number;
  validation_warnings: number;
}
export class DdexDiffViewer {
  free(): void;
  /**
   * Create a new diff viewer
   */
  constructor();
  /**
   * Create a new diff viewer with custom configuration
   */
  static with_config(config_json: string): DdexDiffViewer;
  /**
   * Compare two DDEX XML strings and return HTML diff viewer
   */
  diff_to_html(old_xml: string, new_xml: string): string;
  /**
   * Compare two DDEX XML strings and return JSON diff
   */
  diff_to_json(old_xml: string, new_xml: string): string;
  /**
   * Get diff summary as text
   */
  diff_to_summary(old_xml: string, new_xml: string): string;
  /**
   * Generate JSON Patch from diff
   */
  diff_to_json_patch(old_xml: string, new_xml: string): string;
}
export class FidelityOptions {
  free(): void;
  constructor();
  static createPerfectFidelity(): FidelityOptions;
  static createFastProcessing(): FidelityOptions;
  enable_perfect_fidelity: boolean;
  canonicalization: string;
  preserve_comments: boolean;
  preserve_processing_instructions: boolean;
  preserve_extensions: boolean;
  preserve_attribute_order: boolean;
  preserve_namespace_prefixes: boolean;
  enable_verification: boolean;
  collect_statistics: boolean;
  enable_deterministic_ordering: boolean;
  memory_optimization: string;
  streaming_mode: boolean;
  chunk_size: number;
  enable_checksums: boolean;
}
export class Release {
  free(): void;
  constructor(release_id: string, release_type: string, title: string, artist: string);
  release_id: string;
  release_type: string;
  title: string;
  artist: string;
  get label(): string | undefined;
  set label(value: string | null | undefined);
  get catalog_number(): string | undefined;
  set catalog_number(value: string | null | undefined);
  get upc(): string | undefined;
  set upc(value: string | null | undefined);
  get release_date(): string | undefined;
  set release_date(value: string | null | undefined);
  get genre(): string | undefined;
  set genre(value: string | null | undefined);
  get parental_warning(): boolean | undefined;
  set parental_warning(value: boolean | null | undefined);
  track_ids: string[];
  metadata: any;
}
export class Resource {
  free(): void;
  constructor(resource_id: string, resource_type: string, title: string, artist: string);
  resource_id: string;
  resource_type: string;
  title: string;
  artist: string;
  get isrc(): string | undefined;
  set isrc(value: string | null | undefined);
  get duration(): string | undefined;
  set duration(value: string | null | undefined);
  get track_number(): number | undefined;
  set track_number(value: number | null | undefined);
  get volume_number(): number | undefined;
  set volume_number(value: number | null | undefined);
  metadata: any;
}
export class ValidationResult {
  free(): void;
  constructor(is_valid: boolean);
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}
export class VerificationResult {
  free(): void;
  constructor(round_trip_success: boolean, fidelity_score: number, canonicalization_consistent: boolean, determinism_verified: boolean);
  round_trip_success: boolean;
  fidelity_score: number;
  canonicalization_consistent: boolean;
  determinism_verified: boolean;
  issues: string[];
  get checksums_match(): boolean | undefined;
  set checksums_match(value: boolean | null | undefined);
}
export class WasmDdexBuilder {
  free(): void;
  constructor();
  addRelease(release: Release): void;
  addResource(resource: Resource): void;
  build(): Promise<string>;
  buildWithFidelity(fidelity_options?: FidelityOptions | null): Promise<BuildResult>;
  testRoundTripFidelity(original_xml: string, fidelity_options?: FidelityOptions | null): Promise<VerificationResult>;
  canonicalizeXml(xml: string, canonicalization: string): string;
  validate(): ValidationResult;
  getStats(): BuilderStats;
  reset(): void;
  getAvailablePresets(): string[];
  getPresetInfo(preset_name: string): any;
  applyPreset(preset_name: string): void;
  getPresetValidationRules(preset_name: string): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_ddexdiffviewer_free: (a: number, b: number) => void;
  readonly ddexdiffviewer_new: () => number;
  readonly ddexdiffviewer_with_config: (a: number, b: number, c: number) => void;
  readonly ddexdiffviewer_diff_to_html: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly ddexdiffviewer_diff_to_json: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly ddexdiffviewer_diff_to_summary: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly ddexdiffviewer_diff_to_json_patch: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly main: () => void;
  readonly __wbg_release_free: (a: number, b: number) => void;
  readonly __wbg_get_release_release_id: (a: number, b: number) => void;
  readonly __wbg_set_release_release_id: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_release_type: (a: number, b: number) => void;
  readonly __wbg_set_release_release_type: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_title: (a: number, b: number) => void;
  readonly __wbg_set_release_title: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_artist: (a: number, b: number) => void;
  readonly __wbg_set_release_artist: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_label: (a: number, b: number) => void;
  readonly __wbg_set_release_label: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_catalog_number: (a: number, b: number) => void;
  readonly __wbg_set_release_catalog_number: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_upc: (a: number, b: number) => void;
  readonly __wbg_set_release_upc: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_release_date: (a: number, b: number) => void;
  readonly __wbg_set_release_release_date: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_genre: (a: number, b: number) => void;
  readonly __wbg_set_release_genre: (a: number, b: number, c: number) => void;
  readonly __wbg_get_release_parental_warning: (a: number) => number;
  readonly __wbg_set_release_parental_warning: (a: number, b: number) => void;
  readonly release_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly release_track_ids: (a: number, b: number) => void;
  readonly release_set_track_ids: (a: number, b: number, c: number) => void;
  readonly release_metadata: (a: number) => number;
  readonly release_set_metadata: (a: number, b: number, c: number) => void;
  readonly __wbg_resource_free: (a: number, b: number) => void;
  readonly __wbg_get_resource_resource_id: (a: number, b: number) => void;
  readonly __wbg_set_resource_resource_id: (a: number, b: number, c: number) => void;
  readonly __wbg_get_resource_resource_type: (a: number, b: number) => void;
  readonly __wbg_set_resource_resource_type: (a: number, b: number, c: number) => void;
  readonly __wbg_get_resource_title: (a: number, b: number) => void;
  readonly __wbg_set_resource_title: (a: number, b: number, c: number) => void;
  readonly __wbg_get_resource_artist: (a: number, b: number) => void;
  readonly __wbg_set_resource_artist: (a: number, b: number, c: number) => void;
  readonly __wbg_get_resource_isrc: (a: number, b: number) => void;
  readonly __wbg_set_resource_isrc: (a: number, b: number, c: number) => void;
  readonly __wbg_get_resource_duration: (a: number, b: number) => void;
  readonly __wbg_set_resource_duration: (a: number, b: number, c: number) => void;
  readonly __wbg_get_resource_track_number: (a: number) => number;
  readonly __wbg_set_resource_track_number: (a: number, b: number) => void;
  readonly __wbg_get_resource_volume_number: (a: number) => number;
  readonly __wbg_set_resource_volume_number: (a: number, b: number) => void;
  readonly resource_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly resource_metadata: (a: number) => number;
  readonly resource_set_metadata: (a: number, b: number, c: number) => void;
  readonly __wbg_validationresult_free: (a: number, b: number) => void;
  readonly __wbg_get_validationresult_is_valid: (a: number) => number;
  readonly __wbg_set_validationresult_is_valid: (a: number, b: number) => void;
  readonly validationresult_new: (a: number) => number;
  readonly validationresult_errors: (a: number, b: number) => void;
  readonly validationresult_warnings: (a: number, b: number) => void;
  readonly validationresult_set_errors: (a: number, b: number, c: number) => void;
  readonly validationresult_set_warnings: (a: number, b: number, c: number) => void;
  readonly __wbg_builderstats_free: (a: number, b: number) => void;
  readonly __wbg_get_builderstats_releases_count: (a: number) => number;
  readonly __wbg_set_builderstats_releases_count: (a: number, b: number) => void;
  readonly __wbg_get_builderstats_resources_count: (a: number) => number;
  readonly __wbg_set_builderstats_resources_count: (a: number, b: number) => void;
  readonly __wbg_get_builderstats_total_build_time_ms: (a: number) => number;
  readonly __wbg_set_builderstats_total_build_time_ms: (a: number, b: number) => void;
  readonly __wbg_get_builderstats_last_build_size_bytes: (a: number) => number;
  readonly __wbg_set_builderstats_last_build_size_bytes: (a: number, b: number) => void;
  readonly __wbg_get_builderstats_validation_errors: (a: number) => number;
  readonly __wbg_set_builderstats_validation_errors: (a: number, b: number) => void;
  readonly __wbg_get_builderstats_validation_warnings: (a: number) => number;
  readonly __wbg_set_builderstats_validation_warnings: (a: number, b: number) => void;
  readonly __wbg_fidelityoptions_free: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_enable_perfect_fidelity: (a: number) => number;
  readonly __wbg_set_fidelityoptions_enable_perfect_fidelity: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_canonicalization: (a: number, b: number) => void;
  readonly __wbg_set_fidelityoptions_canonicalization: (a: number, b: number, c: number) => void;
  readonly __wbg_get_fidelityoptions_preserve_comments: (a: number) => number;
  readonly __wbg_set_fidelityoptions_preserve_comments: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_preserve_processing_instructions: (a: number) => number;
  readonly __wbg_set_fidelityoptions_preserve_processing_instructions: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_preserve_extensions: (a: number) => number;
  readonly __wbg_set_fidelityoptions_preserve_extensions: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_preserve_attribute_order: (a: number) => number;
  readonly __wbg_set_fidelityoptions_preserve_attribute_order: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_preserve_namespace_prefixes: (a: number) => number;
  readonly __wbg_set_fidelityoptions_preserve_namespace_prefixes: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_enable_verification: (a: number) => number;
  readonly __wbg_set_fidelityoptions_enable_verification: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_collect_statistics: (a: number) => number;
  readonly __wbg_set_fidelityoptions_collect_statistics: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_enable_deterministic_ordering: (a: number) => number;
  readonly __wbg_set_fidelityoptions_enable_deterministic_ordering: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_memory_optimization: (a: number, b: number) => void;
  readonly __wbg_set_fidelityoptions_memory_optimization: (a: number, b: number, c: number) => void;
  readonly __wbg_get_fidelityoptions_streaming_mode: (a: number) => number;
  readonly __wbg_set_fidelityoptions_streaming_mode: (a: number, b: number) => void;
  readonly __wbg_get_fidelityoptions_enable_checksums: (a: number) => number;
  readonly __wbg_set_fidelityoptions_enable_checksums: (a: number, b: number) => void;
  readonly fidelityoptions_new: () => number;
  readonly fidelityoptions_createPerfectFidelity: () => number;
  readonly fidelityoptions_createFastProcessing: () => number;
  readonly __wbg_buildstatistics_free: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_build_time_ms: (a: number) => number;
  readonly __wbg_set_buildstatistics_build_time_ms: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_memory_used_bytes: (a: number) => number;
  readonly __wbg_set_buildstatistics_memory_used_bytes: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_xml_size_bytes: (a: number) => number;
  readonly __wbg_set_buildstatistics_xml_size_bytes: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_element_count: (a: number) => number;
  readonly __wbg_set_buildstatistics_element_count: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_attribute_count: (a: number) => number;
  readonly __wbg_set_buildstatistics_attribute_count: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_namespace_count: (a: number) => number;
  readonly __wbg_set_buildstatistics_namespace_count: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_extension_count: (a: number) => number;
  readonly __wbg_set_buildstatistics_extension_count: (a: number, b: number) => void;
  readonly __wbg_get_buildstatistics_canonicalization_time_ms: (a: number) => number;
  readonly __wbg_set_buildstatistics_canonicalization_time_ms: (a: number, b: number) => void;
  readonly buildstatistics_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly buildstatistics_verification_time_ms: (a: number, b: number) => void;
  readonly buildstatistics_set_verification_time_ms: (a: number, b: number, c: number) => void;
  readonly __wbg_verificationresult_free: (a: number, b: number) => void;
  readonly __wbg_get_verificationresult_canonicalization_consistent: (a: number) => number;
  readonly __wbg_set_verificationresult_canonicalization_consistent: (a: number, b: number) => void;
  readonly __wbg_get_verificationresult_determinism_verified: (a: number) => number;
  readonly __wbg_set_verificationresult_determinism_verified: (a: number, b: number) => void;
  readonly verificationresult_new: (a: number, b: number, c: number, d: number) => number;
  readonly verificationresult_issues: (a: number, b: number) => void;
  readonly verificationresult_set_issues: (a: number, b: number, c: number) => void;
  readonly verificationresult_checksums_match: (a: number) => number;
  readonly verificationresult_set_checksums_match: (a: number, b: number) => void;
  readonly __wbg_buildresult_free: (a: number, b: number) => void;
  readonly __wbg_get_buildresult_xml: (a: number, b: number) => void;
  readonly __wbg_set_buildresult_xml: (a: number, b: number, c: number) => void;
  readonly buildresult_new: (a: number, b: number) => number;
  readonly buildresult_statistics: (a: number) => number;
  readonly buildresult_set_statistics: (a: number, b: number) => void;
  readonly buildresult_verification: (a: number) => number;
  readonly buildresult_set_verification: (a: number, b: number) => void;
  readonly builderstats_new: () => number;
  readonly __wbg_wasmddexbuilder_free: (a: number, b: number) => void;
  readonly wasmddexbuilder_new: (a: number) => void;
  readonly wasmddexbuilder_addRelease: (a: number, b: number) => void;
  readonly wasmddexbuilder_addResource: (a: number, b: number) => void;
  readonly wasmddexbuilder_build: (a: number) => number;
  readonly wasmddexbuilder_buildWithFidelity: (a: number, b: number) => number;
  readonly wasmddexbuilder_testRoundTripFidelity: (a: number, b: number, c: number, d: number) => number;
  readonly wasmddexbuilder_canonicalizeXml: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmddexbuilder_validate: (a: number) => number;
  readonly wasmddexbuilder_getStats: (a: number) => number;
  readonly wasmddexbuilder_reset: (a: number) => void;
  readonly wasmddexbuilder_getAvailablePresets: (a: number, b: number) => void;
  readonly wasmddexbuilder_getPresetInfo: (a: number, b: number, c: number, d: number) => void;
  readonly wasmddexbuilder_applyPreset: (a: number, b: number, c: number, d: number) => void;
  readonly wasmddexbuilder_getPresetValidationRules: (a: number, b: number, c: number, d: number) => void;
  readonly batchBuild: (a: number) => number;
  readonly validateStructure: (a: number, b: number) => number;
  readonly version: (a: number) => void;
  readonly __wbg_set_fidelityoptions_chunk_size: (a: number, b: number) => void;
  readonly __wbg_set_verificationresult_fidelity_score: (a: number, b: number) => void;
  readonly __wbg_set_verificationresult_round_trip_success: (a: number, b: number) => void;
  readonly __wbg_get_verificationresult_round_trip_success: (a: number) => number;
  readonly __wbg_get_fidelityoptions_chunk_size: (a: number) => number;
  readonly __wbg_get_verificationresult_fidelity_score: (a: number) => number;
  readonly __wbindgen_export_0: (a: number, b: number) => number;
  readonly __wbindgen_export_1: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: (a: number) => void;
  readonly __wbindgen_export_3: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_5: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_6: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
