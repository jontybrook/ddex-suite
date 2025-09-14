//! DDEX Parser CLI entry point

mod cli;
mod error;
mod parser;
mod streaming;
mod transform;
mod utf8_utils;

// Re-export for CLI use
pub use ddex_parser::DDEXParser;

fn main() {
    if let Err(e) = cli::main() {
        eprintln!("Error: {:#}", e);
        std::process::exit(1);
    }
}
