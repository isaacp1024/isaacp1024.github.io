"""Local publisher unit tests. Fixtures below are synthetic and never published."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('publisher', ROOT / 'scripts/publish_benchmark.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


def fixture():
    return {
        'schema_version': 1,
        'market': {'id': 'synthetic-test-only', 'name': 'Synthetic test fixture', 'scope': 'Three fictional models. Test only.'},
        'methodology': {'version': 'test-only-v1', 'price_basis': 'Synthetic test inputs',
                        'pricing_convention': 'Already standardized test prices.', 'href': 'ccbt.html#implementation'},
        'observations': [{
            'observation_date': '2025-01-07', 'published_at': '2025-01-08T12:00:00Z',
            'usage_window': {'start': '2025-01-01', 'end': '2025-01-07'},
            'coverage_note': 'All rows in this fictional test fixture; no real market coverage.',
            'sources': [{'kind': 'price', 'label': 'Fictional test price source', 'url': 'https://example.com/test-prices'},
                        {'kind': 'usage', 'label': 'Fictional test usage source', 'url': 'https://example.com/test-usage'}],
            'constituents': [{'id': 'a', 'name': 'Model A', 'price_usd_per_million': 0.8, 'usage_tokens': 50_000_000},
                             {'id': 'b', 'name': 'Model B', 'price_usd_per_million': 2.0, 'usage_tokens': 35_000_000},
                             {'id': 'c', 'name': 'Model C', 'price_usd_per_million': 5.0, 'usage_tokens': 15_000_000}]
        }]
    }


class PublisherTests(unittest.TestCase):
    def test_valid_reference(self):
        result = publisher.validate(fixture())
        self.assertAlmostEqual(result[0]['price_usd_per_million_ccbt'], 1.85)
        self.assertEqual(result[0]['usage_tokens'], 100_000_000)

    def test_prepublication_valid(self):
        data = json.loads((ROOT/'data/benchmark.json').read_text())
        self.assertEqual(publisher.validate(data), [])

    def test_empty_usage_rejected(self):
        data=fixture()
        for row in data['observations'][0]['constituents']: row['usage_tokens']=0
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_zero_reference_rejected(self):
        data=fixture()
        for row in data['observations'][0]['constituents']: row['price_usd_per_million']=0
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_negative_price_rejected(self):
        data=fixture(); data['observations'][0]['constituents'][0]['price_usd_per_million']=-1
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_nonfinite_rejected(self):
        data=fixture(); data['observations'][0]['constituents'][0]['price_usd_per_million']=float('nan')
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_boolean_rejected(self):
        data=fixture(); data['observations'][0]['constituents'][0]['usage_tokens']=True
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_duplicate_model_rejected(self):
        data=fixture(); data['observations'][0]['constituents'][1]['id']='a'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_missing_usage_source_rejected(self):
        data=fixture(); data['observations'][0]['sources'].pop()
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_unsafe_source_rejected(self):
        data=fixture(); data['observations'][0]['sources'][0]['url']='javascript:alert(1)'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_usage_after_observation_rejected(self):
        data=fixture(); data['observations'][0]['usage_window']['end']='2025-01-09'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_impossible_date_rejected(self):
        data=fixture(); data['observations'][0]['observation_date']='2025-02-30'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_future_date_rejected(self):
        data=fixture(); data['observations'][0]['published_at']='2999-01-08T12:00:00Z'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_naive_timestamp_rejected(self):
        data=fixture(); data['observations'][0]['published_at']='2025-01-08T12:00:00'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_duplicate_observations_rejected(self):
        data=fixture(); data['observations'].append(copy.deepcopy(data['observations'][0]))
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_placeholders_rejected_when_publishing(self):
        data=fixture(); data['methodology']['version']='pre-publication'
        with self.assertRaises(ValueError): publisher.validate(data)

    def test_failed_validation_preserves_existing_js(self):
        with tempfile.TemporaryDirectory() as directory:
            src=Path(directory)/'data.json'; dest=Path(directory)/'data.js'
            data=fixture(); data['observations'][0]['constituents'][0]['usage_tokens']=-3
            src.write_text(json.dumps(data)); dest.write_text('LAST VALID FILE')
            with self.assertRaises(ValueError): publisher.publish(src,dest)
            self.assertEqual(dest.read_text(),'LAST VALID FILE')

    def test_successful_publish_keeps_raw_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            src=Path(directory)/'data.json'; dest=Path(directory)/'data.js'
            data=fixture(); src.write_text(json.dumps(data))
            publisher.publish(src,dest)
            self.assertIn('window.SB_BENCHMARK = ',dest.read_text())
            self.assertIn('50000000',dest.read_text())
            self.assertEqual(json.loads(src.read_text()),data)

    def test_html_sequence_escaped_in_js(self):
        with tempfile.TemporaryDirectory() as directory:
            src=Path(directory)/'data.json'; dest=Path(directory)/'data.js'
            data=fixture(); data['market']['name']='</script><script>alert(1)</script>'
            src.write_text(json.dumps(data)); publisher.publish(src,dest)
            self.assertNotIn('</script>',dest.read_text())

    def test_two_observations(self):
        data=fixture(); second=copy.deepcopy(data['observations'][0])
        second['observation_date']='2025-01-14'; second['published_at']='2025-01-15T12:00:00Z'
        second['usage_window']={'start':'2025-01-08','end':'2025-01-14'}
        second['constituents'][0]['price_usd_per_million']=1.0
        data['observations'].append(second)
        self.assertAlmostEqual(publisher.validate(data)[1]['price_usd_per_million_ccbt'],1.95)


if __name__=='__main__': unittest.main()
