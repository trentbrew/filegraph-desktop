{
  description = "Filegraph – local-first knowledge graph (Tauri v2 + React)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        # Rust toolchain matching the project's edition (2021)
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
          targets = [ ];
        };

        # System libraries required by Tauri v2 on Linux
        buildInputs = with pkgs; [
          # GTK / WebKit (Tauri v2 webview)
          webkitgtk_4_1
          gtk3
          glib
          glib-networking # TLS support for WebKit
          libsoup_3

          # System integration
          dbus
          openssl

          # Graphics / media
          cairo
          pango
          gdk-pixbuf
          atk
          harfbuzz

          # AppIndicator / tray (optional but common)
          libappindicator-gtk3

          # File dialog (tauri-plugin-dialog uses xdg-desktop-portal)
          xdotool

          # PDF extraction (pdf-extract crate uses poppler)
          poppler

          # Misc native deps from Cargo.toml
          pkg-config
        ];

        nativeBuildInputs = with pkgs; [
          # Build tools
          pkg-config
          gobject-introspection
          wrapGAppsHook3

          # Rust
          rustToolchain
          cargo

          # Node / pnpm
          nodejs_22
          corepack_22

          # Tauri CLI (via pnpm, but cargo needs these at link time)
          gcc
          cmake
        ];

        # Libraries that need to be on LD_LIBRARY_PATH for the Tauri dev server
        runtimeLibs = with pkgs; [
          webkitgtk_4_1
          gtk3
          glib
          dbus
          openssl
          libsoup_3
          glib-networking
          cairo
          pango
          gdk-pixbuf
          atk
          harfbuzz
          libappindicator-gtk3
        ];

      in {
        devShells.default = pkgs.mkShell {
          inherit buildInputs nativeBuildInputs;

          shellHook = ''
            # Set library path for Tauri's webview at runtime
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath runtimeLibs}:$LD_LIBRARY_PATH"

            # pkg-config needs to find the GTK/WebKit .pc files
            export PKG_CONFIG_PATH="${pkgs.lib.makeSearchPathOutput "dev" "lib/pkgconfig" buildInputs}:$PKG_CONFIG_PATH"

            # GIO modules (for TLS in WebKit)
            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules"

            # XDG data dirs for GTK icon themes, etc.
            export XDG_DATA_DIRS="${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:$XDG_DATA_DIRS"

            echo "🌿 Filegraph dev shell ready"
            echo "   Run: pnpm install && pnpm tauri dev"
          '';
        };
      }
    );
}
