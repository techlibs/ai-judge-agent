# Kiwi News

**Grant program**: Optimism RetroPGF Round 3, Octant Epoch grantee, multiple Gitcoin rounds
**Amount**: ~10,000 OP from Optimism RetroPGF 3 (approx); additional small grants from Octant community rounds and Gitcoin quadratic matching
**Status/outcome**: Active and growing. Runs a live production p2p network (news.kiwistand.com) with a paid-membership NFT gating mechanism. Small but dedicated crypto-native user base.

## Links
- **GitHub**: https://github.com/attestate/kiwistand (public repo, README present, MIT-licensed Node.js p2p client)
- **Video**: https://www.youtube.com/watch?v=LjJ27GhofYQ ("Kiwi News: Decentralized Hacker News @ DevNTell" — official demo/interview on the Kiwi News YouTube channel)
- **Website**: https://news.kiwistand.com/

## Project summary
Kiwi News is a decentralized, crypto-native alternative to Hacker News. Users mint a "Kiwi Pass" NFT to gain write access (submit links, upvote), and all link submissions plus votes are broadcast over a libp2p gossipsub network where any node can reconstruct the full ordered feed. Because the state is held on the p2p protocol rather than a server, the UI layer becomes interchangeable — anyone can run a node, fork the frontend, or build a competing client on the same data.

The problem it targets is platform capture: Hacker News, Reddit, and Farcaster all have (or can have) central operators that gatekeep submissions and moderation. Kiwi's thesis is that a curated feed of "web3 alpha" is itself a public good that should outlive its current maintainers, and that p2p gossipsub + NFT-gated writes is a sustainable mechanism for spam-resistant decentralized curation.

Its impact is niche but philosophically clear: it is one of the few production p2p social apps on Ethereum that is not hosted behind a single-operator indexer, and it has become a reference in Protocol Guild/Octant discussions about what "independent crypto media" funded as a public good looks like.

## Team
Mac Budkowski (product/community) and Tim Daubenschütz (protocol/engineering) as the public-facing core contributors. Both have established reputations in the EU Ethereum scene (ETHWarsaw, Devconnect, Zeitgeist demo day). Small team, transparent with real identities.

## Budget
Typical ask in public-goods rounds: $20–80k USD-equivalent per epoch, split across protocol development (libp2p node, message validation), frontend, and community operations (Kiwi Pod podcast, newsletter curation).

## Why this is a good judge-agent test case
Experimental/newer profile — tests whether judges reward novel architecture (p2p gossipsub for social feeds) and niche-but-engaged community metrics over raw star counts and TVL proxies. Low GitHub star count but high-quality video evidence of real traction. Should stress Impact Potential and Team Capability signals when the conventional quantitative indicators are modest.
