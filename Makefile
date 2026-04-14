.PHONY: build test lint fmt dev-solana dev-ethereum clean

build:
	anchor build
	cd contracts && forge build

test:
	bun test
	cd contracts && forge test -vvv

lint:
	cd contracts && forge fmt --check
	cd contracts && bunx solhint 'src/**/*.sol'
	cargo clippy --workspace -- -D warnings

fmt:
	cd contracts && forge fmt
	cargo fmt --all

dev-solana:
	solana-test-validator

dev-ethereum:
	anvil

clean:
	anchor clean
	cd contracts && forge clean
	rm -rf node_modules dist
