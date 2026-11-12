# CAL-SCAN-ACCURACY-002 benchmark attribution

This benchmark contains a bounded local subset. It does not contain the complete source archives.

## VLM Food Benchmark

Source: https://github.com/Metabolic-Intelligence-Lab/vlm-food-benchmark

Dataset license: Creative Commons Attribution 4.0 International (CC BY 4.0), as stated in the source repository's `LICENSE-DATA`. Attribution: Marchetti, T.; Capezzone, S.; Esposito, R.; De Spirito, M.; Maulucci, G. “Benchmarking Open-Source Vision-Language Models for Food Image Recognition and Portion Size Estimation.” *Nutrients* 2026, 18(21), 3582. The subset contains 58 original resized images and the corresponding weighed item labels. The published labels provide item names and grams but not calories or macronutrients; those fields remain unavailable.

## Nutrition5k

Source: https://github.com/google-research-datasets/Nutrition5k

Dataset license: Creative Commons Attribution 4.0 International (CC BY 4.0), as stated in the source repository README. Attribution: Thames, Q.; Karpur, A.; Norris, W.; Xia, F.; Panait, L.; Weyand, T.; Sim, J. “Nutrition5k: Towards Automatic Nutritional Understanding of Generic Food.” *Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition*, 2021, pp. 8903–8911. The subset contains 10 selected overhead RGB images, selected metadata rows, and the source ingredient metadata. The complete 181.4 GB archive was not downloaded.

## Scope and limitations

The sources are mostly California cafeteria and European university-canteen meals. The subset contains no African dishes. It is suitable for a reproducible regression smoke benchmark, not a representative estimate of global food-recognition accuracy. Metrics must be reported separately for identity/portion references and nutrition references. Missing reference fields must remain unavailable rather than being imputed.
